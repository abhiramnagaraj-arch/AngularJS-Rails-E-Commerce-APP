class Api::V1::OrdersController < ApplicationController
  before_action :authenticate_api_v1_user!
  load_and_authorize_resource except: [:index, :show, :create_razorpay_order, :verify_razorpay_payment, :checkout]

  def index
    @orders = current_user.orders
      .includes(:shipping_address, order_items: :product)
      .order(created_at: :desc)

    render json: @orders.as_json(include: {
      shipping_address: {},
      order_items: { include: { product: { only: [:id, :name, :price, :image_url] } } }
    })
  end

  def show
    @order = current_user.orders.find(params[:id])
    render json: @order.as_json(include: {
      shipping_address: {},
      order_items: { include: { product: { only: [:id, :name, :price, :image_url] } } }
    })
  end

  def create_razorpay_order
    # Ensure address belongs to user
    address = current_user.addresses.find_by(id: params[:address_id])
    return render json: { error: 'Invalid or missing delivery address' }, status: :unprocessable_entity unless address

    # Pre-check stock before requesting a Razorpay Order
    cart = current_user.cart
    return render json: { error: 'Cart is empty' }, status: :unprocessable_entity if cart.nil? || cart.cart_items.empty?

    cart.cart_items.each do |item|
      if item.product.stock_quantity < item.quantity
        return render json: { error: "Insufficient stock for #{item.product.name}" }, status: :unprocessable_entity
      end
    end

    amount_in_paise = cart.cart_items.sum { |item| item.product.price * item.quantity } * 100

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
      render json: { 
        id: razorpay_order.id,
        amount: razorpay_order.amount,
        currency: razorpay_order.currency,
        key_id: ENV['RAZORPAY_KEY_ID']
      }
    else
      render json: { error: 'Failed to initialize payment gateway' }, status: :service_unavailable
    end
  end

  def verify_razorpay_payment
    # 1. Verify Address first
    address = current_user.addresses.find_by(id: params[:address_id])
    return render json: { error: 'Invalid or missing delivery address' }, status: :unprocessable_entity unless address

    # 2. Verify Razorpay Signature
    success = RazorpayService.verify_signature({
      razorpay_order_id: params[:razorpay_order_id],
      razorpay_payment_id: params[:razorpay_payment_id],
      razorpay_signature: params[:razorpay_signature]
    })

    if success
      # Find user and cart
      cart = current_user.cart
      return render json: { error: 'Cart is empty' }, status: :unprocessable_entity if cart.nil? || cart.cart_items.empty?

      ActiveRecord::Base.transaction do
        # Check for stock again before finalizing
        cart.cart_items.each do |item|
          if item.product.stock_quantity < item.quantity
            raise StandardError, "Insufficient stock for #{item.product.name}"
          end
        end

        # Create Order
        total_amount = cart.cart_items.sum { |item| item.product.price * item.quantity }
        order = current_user.orders.create!(
          shipping_address_id: address.id,
          total_amount: total_amount,
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

          commission = item.product.price * 0.1 * item.quantity
          order.order_items.create!(
            product: product,
            seller: product.seller,
            quantity: item.quantity,
            price_at_purchase: product.price,
            commission_amount: commission,
            status: :pending
          )
        end

        # Clear Cart
        cart.cart_items.destroy_all
        render json: { message: 'Order placed successfully', order: order }, status: :created
      end
    else
      render json: { error: 'Invalid payment signature' }, status: :bad_request
    end
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def checkout
    # LEGACY: Order creation before payment. 
    # This is being replaced by the create_payment_intent -> Webhook flow.
    # We will keep a simplified version for Cash on Delivery (COD) if needed.
    
    allowed_methods = ['COD']
    unless allowed_methods.include?(params[:payment_method])
      return render json: { error: "Invalid payment method. This endpoint only accepts: #{allowed_methods.join(', ')}" }, status: :unprocessable_entity
    end

    # Simple COD flow (No Stripe involved)
    @cart = current_user.cart
    return render json: { error: 'Cart is empty' }, status: :unprocessable_entity if @cart.nil? || @cart.cart_items.empty?

    @address = current_user.addresses.find_by(id: params[:address_id])
    return render json: { error: 'Invalid or missing delivery address' }, status: :unprocessable_entity unless @address

    begin
      ActiveRecord::Base.transaction do
        # 1. Pre-check stock for ALL items before doing any updates
        @cart.cart_items.each do |item|
          if item.product.stock_quantity < item.quantity
            raise StandardError, "Insufficient stock for #{item.product.name}. Available: #{item.product.stock_quantity}"
          end
        end

        total_amount = @cart.cart_items.sum { |item| item.product.price * item.quantity }
        
        @order = current_user.orders.create!(
          shipping_address_id: @address.id,
          total_amount: total_amount, 
          status: :pending, 
          payment_status: :unpaid,
          payment_method: 'COD'
        )

        @cart.cart_items.each do |item|
          product = item.product
          product.lock!
          product.update!(stock_quantity: product.stock_quantity - item.quantity)

          commission = product.price * 0.1 * item.quantity

          @order.order_items.create!(
            product: product,
            seller: product.seller,
            quantity: item.quantity,
            price_at_purchase: product.price,
            commission_amount: commission,
            status: :pending
          )
        end

        @cart.cart_items.destroy_all
        render json: { order: @order, message: "Order placed successfully (Cash on Delivery)" }, status: :created
      end
    rescue StandardError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end
end
