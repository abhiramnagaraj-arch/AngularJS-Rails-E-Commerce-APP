class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :product
  belongs_to :seller
  belongs_to :invoice, optional: true

  # searchkick callbacks: false

  enum :status, { pending: 0, shipped: 1, delivered: 2, cancelled: 3 }

  validates :quantity, presence: true, numericality: { greater_than: 0 }
  validates :price_at_purchase, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  before_create :set_prices_and_commissions
  after_save :update_order_total
  after_destroy :update_order_total

  include AASM

  aasm column: :status, enum: true do
    state :pending, initial: true 
    state :shipped
    state :delivered
    state :cancelled

    event :ship do
      transitions from: :pending, to: :shipped
    end

    event :deliver do
      transitions from: :shipped, to: :delivered, after: :credit_seller_account
    end

    event :cancel do
      transitions from: [:pending, :shipped], to: :cancelled
    end
  end

  private

  def set_prices_and_commissions
    self.price_at_purchase = product.price if price_at_purchase.nil?
    self.total_price = quantity * price_at_purchase
    self.commission_amount = total_price * 0.10 # 10% commission
  end

  def credit_seller_account
    seller.credit_account!(total_price - commission_amount)
  end

  def update_order_total
    order.update_total!
  end
end
