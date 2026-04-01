class Api::V1::OrdersController < ApplicationController
  include Paginatable
  before_action :authenticate_api_v1_user!
  load_and_authorize_resource except: [:index, :show, :create_razorpay_order, :verify_razorpay_payment, :checkout]

  def index
    scope = current_user.orders
      .includes(:shipping_address, order_items: :product)
      .order(created_at: :desc)

    result = paginate(scope)

    orders_data = result[:data].as_json(include: {
      shipping_address: {},
      order_items: { include: { product: { only: [:id, :name, :price], methods: [:image_url, :image] } } }
    })

    render_success(orders_data, "Orders fetched successfully", :ok, meta: result[:meta])
  end

  def show
    @order = current_user.orders.find(params[:id])
    order_data = @order.as_json(include: {
      shipping_address: {},
      order_items: { include: { product: { only: [:id, :name, :price], methods: [:image_url, :image] } } }
    })
    render_success(order_data)
  end

  def create_razorpay_order
    # Ensure address belongs to user
    address = current_user.addresses.find_by(id: params[:address_id])
    return render_error('Invalid or missing delivery address') unless address

    # Pre-check stock before requesting a Razorpay Order
    cart = current_user.cart
    return render_error('Cart is empty') if cart.nil? || cart.cart_items.empty?

    cart.cart_items.includes(:product).each do |item|
      if item.product.price != item.product.reload.price
        changed_items = cart.cart_items.includes(:product).select { |i| i.product.price != i.product.reload.price }
        return render_error(
          "Prices have changed. Please review your cart before placing the order.",
          changed_items.map { |i| { product_id: i.product.id, product_name: i.product.name, new_price: i.product.price } }
        )
      end

      if item.product.stock_quantity < item.quantity
        return render_error("Insufficient stock for #{item.product.name}")
      end
    end

    amount_in_paise = (cart.total_price * 100).to_i

    razorpay_order = RazorpayService.create_order(
      amount_in_paise,
      "receipt_user_#{current_user.id}_#{Time.now.to_i}", # Receipt ID
      {
        user_id: current_user.id,
        address_id: address.id,
        payment_method: params[:payment_method] || 'Online'
      }
    )

    if razorpay_order
      render_success({ 
        id: razorpay_order.id,
        amount: razorpay_order.amount,
        currency: razorpay_order.currency,
        key_id: ENV['RAZORPAY_KEY_ID']
      })
    else
      render_error('Failed to initialize payment gateway', [], :service_unavailable)
    end
  end

  def verify_razorpay_payment
    # 1. Verify Address first
    address = current_user.addresses.find_by(id: params[:address_id])
    return render_error('Invalid or missing delivery address') unless address

    # 2. Verify Razorpay Signature
    success = RazorpayService.verify_signature({
      razorpay_order_id: params[:razorpay_order_id],
      razorpay_payment_id: params[:razorpay_payment_id],
      razorpay_signature: params[:razorpay_signature]
    })

    if success
      # Find user and cart
      cart = current_user.cart
      return render_error('Cart is empty') if cart.nil? || cart.cart_items.empty?

      ActiveRecord::Base.transaction do
        # Check for stock again before finalizing
        cart.cart_items.each do |item|
          if item.product.stock_quantity < item.quantity
            raise StandardError, "Insufficient stock for #{item.product.name}"
          end
        end

        # Create Order
        order = current_user.orders.create!(
          shipping_address_id: address.id,
          total_amount: cart.total_price,
          status: :paid,
          payment_status: :paid,
          payment_method: params[:payment_method] || 'Online',
          razorpay_order_id: params[:razorpay_order_id],
          razorpay_payment_id: params[:razorpay_payment_id],
          razorpay_signature: params[:razorpay_signature]
        )

        # Create OrderItems & Deduct Stock
        cart.cart_items.each do |item|
          product = item.product
          product.lock!
          product.update!(stock_quantity: product.stock_quantity - item.quantity)

          order.order_items.create!(
            product: product,
            seller: product.seller,
            quantity: item.quantity,
            status: :pending,
            price_at_purchase: product.price,
            total_price: product.price * item.quantity
          )
        end

        # Clear Cart
        cart.cart_items.destroy_all
        render_success({ order: order }, 'Order placed successfully', :created)
      end
    else
      render_error('Invalid payment signature', [], :bad_request)
    end
  rescue StandardError => e
    render_error(e.message)
  end

  def checkout
    # LEGACY: Order creation before payment. 
    # This is being replaced by the create_payment_intent -> Webhook flow.
    # We will keep a simplified version for Cash on Delivery (COD) if needed.
    
    allowed_methods = ['COD']
    unless allowed_methods.include?(params[:payment_method])
      return render_error("Invalid payment method. This endpoint only accepts: #{allowed_methods.join(', ')}")
    end

    # Simple COD flow (No Stripe involved)
    @cart = current_user.cart
    return render_error('Cart is empty') if @cart.nil? || @cart.cart_items.empty?

    @address = current_user.addresses.find_by(id: params[:address_id])
    return render_error('Invalid or missing delivery address') unless @address

    begin
      ActiveRecord::Base.transaction do
        # 1. Price check and Stock check
        changed_items = @cart.cart_items.includes(:product).select do |item|
          item.product.price != item.product.reload.price
        end

        if changed_items.any?
          return render_error(
            "Prices have changed. Please review your cart before placing the order.",
            changed_items.map { |item| { product_id: item.product.id, product_name: item.product.name, new_price: item.product.price } }
          )
        end

        @cart.cart_items.each do |item|
          if item.product.stock_quantity < item.quantity
            raise StandardError, "Insufficient stock for #{item.product.name}. Available: #{item.product.stock_quantity}"
          end
        end

        @order = current_user.orders.create!(
          shipping_address_id: @address.id,
          total_amount: @cart.total_price, 
          status: :pending, 
          payment_status: :unpaid,
          payment_method: 'COD'
        )

        @cart.cart_items.each do |item|
          product = item.product
          product.lock!
          product.update!(stock_quantity: product.stock_quantity - item.quantity)

          @order.order_items.create!(
            product: product,
            seller: product.seller,
            quantity: item.quantity,
            status: :pending,
            price_at_purchase: product.price,
            total_price: product.price * item.quantity
          )
        end

        @cart.cart_items.destroy_all
        render_success({ order: @order }, "Order placed successfully (Cash on Delivery)", :created)
      end
    rescue StandardError => e
      render_error(e.message)
    end
  end
end
