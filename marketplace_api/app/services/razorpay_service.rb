class RazorpayService
  def self.setup
    Razorpay.setup(ENV['RAZORPAY_KEY_ID'], ENV['RAZORPAY_KEY_SECRET'])
  end

  def self.create_order(amount_in_paise, receipt_id, metadata = {})
    setup
    # amount is in paise (e.g. 5000 for ₹50)
    Razorpay::Order.create({
      amount: amount_in_paise.to_i,
      currency: 'INR',
      receipt: receipt_id.to_s,
      notes: metadata
    })
  rescue StandardError => e
    Rails.logger.error "Razorpay Order Creation Error: #{e.message}"
    nil
  end

  def self.verify_signature(params)
    setup
    # Razorpay::Utility.verify_payment_signature throws error if invalid
    Razorpay::Utility.verify_payment_signature(params)
    true
  rescue StandardError => e
    Rails.logger.error "Razorpay Signature Verification Error: #{e.message}"
    false
  end

  def self.verify_webhook_signature(body, signature)
    setup
    # signature is often sent via HTTP_X_RAZORPAY_SIGNATURE
    Razorpay::Utility.verify_webhook_signature(body, signature, ENV['RAZORPAY_KEY_SECRET'])
  rescue StandardError => e
    Rails.logger.error "Razorpay Webhook Signature Verification Error: #{e.message}"
    false
  end
end
