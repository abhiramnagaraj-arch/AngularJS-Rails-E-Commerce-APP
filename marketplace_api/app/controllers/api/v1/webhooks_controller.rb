class Api::V1::WebhooksController < ApplicationController
  skip_before_action :authenticate_api_v1_user! # Webhooks are not authenticated by Devise

  def razorpay
    # Verify the Razorpay webhook signature
    signature = request.env['HTTP_X_RAZORPAY_SIGNATURE']
    body = request.body.read
    
    unless RazorpayService.verify_webhook_signature(body, signature)
      render json: { error: 'Invalid webhook signature' }, status: :unauthorized
      return
    end
    
    payload = JSON.parse(body)
    event = payload['event']
    
    case event
    when 'order.paid'
      razorpay_order = payload['payload']['order']['entity']
      handle_payment_success(razorpay_order)
    when 'payment.captured'
      # Already handled by order.paid in most cases
    end

    head :ok
  end

  private

  def handle_payment_success(razorpay_order)
    # metadata is in notes
    metadata = razorpay_order['notes']
    user_id = metadata['user_id']
    address_id = metadata['address_id']
    payment_method = metadata['payment_method']

    user = User.find_by(id: user_id)
    return unless user && user.cart

    ActiveRecord::Base.transaction do
      # Avoid duplicate order creation
      return if Order.exists?(razorpay_order_id: razorpay_order['id'])

      cart = user.cart
      return if cart.cart_items.empty?

      order = user.orders.create!(
        shipping_address_id: address_id,
        total_amount: razorpay_order['amount'] / 100.0,
        status: :paid,
        payment_status: :paid,
        payment_method: payment_method,
        razorpay_order_id: razorpay_order['id']
      )

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

      cart.cart_items.destroy_all
    end
  end
end
