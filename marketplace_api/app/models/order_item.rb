class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :product
  belongs_to :seller
  belongs_to :invoice, optional: true

  enum :status, { pending: 0, shipped: 1, delivered: 2, cancelled: 3 }

  validates :quantity, presence: true, numericality: { greater_than: 0 }
  validates :price_at_purchase, presence: true, numericality: { greater_than_or_equal_to: 0 }

  def seller_share
    (price_at_purchase * quantity) - (commission_amount || 0)
  end
end
