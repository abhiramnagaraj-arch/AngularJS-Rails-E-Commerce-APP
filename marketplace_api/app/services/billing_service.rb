class BillingService
  def self.generate_daily_invoices
    # Find all order items that are completed (paid/delivered) and not yet invoiced
    # For this demo, we'll pick order items from the last 24 hours that aren't cancelled
    cutoff_time = 24.hours.ago
    pending_items = OrderItem.where(invoice_id: nil)
                             .where.not(status: :cancelled)
                             .where('order_items.created_at >= ?', cutoff_time)
                             .joins(:order)
                             .where(orders: { payment_status: :paid })

    return if pending_items.empty?

    pending_items.group_by(&:seller_id).each do |seller_id, items|
      seller = Seller.find(seller_id)
      
      ActiveRecord::Base.transaction do
        total_amount = items.sum { |item| item.price_at_purchase * item.quantity }
        commission_total = items.sum(&:commission_amount)
        net_payout = total_amount - commission_total

        invoice = Invoice.create!(
          seller: seller,
          total_amount: total_amount,
          commission_total: commission_total,
          net_payout: net_payout,
          billing_date: Time.current,
          status: :pending
        )

        # Mark items as invoiced
        items.each { |item| item.update!(invoice: invoice) }
        
        Rails.logger.info "Generated invoice ##{invoice.id} for seller #{seller.store_name}: ₹#{net_payout} net payout."
      end
    end
  end
end
