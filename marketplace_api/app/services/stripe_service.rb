class StripeService
  def self.create_payment_intent(user, address_id, payment_method)
    Stripe.api_key = ENV['STRIPE_SECRET_KEY']

    cart = user.cart
    return nil if !cart || cart.cart_items.empty?

    # Calculate total in paise (Stripe uses smallest currency unit)
    amount = cart.cart_items.sum { |item| item.product.price * item.quantity } * 100

    Stripe::PaymentIntent.create({
      amount: amount.to_i,
      currency: 'inr',
      payment_method_types: ['card'],
      metadata: {
        user_id: user.id,
        address_id: address_id,
        payment_method: payment_method
      }
    })
  rescue Stripe::StripeError => e
    Rails.logger.error "Stripe Error: #{e.message}"
    nil
  end
end
