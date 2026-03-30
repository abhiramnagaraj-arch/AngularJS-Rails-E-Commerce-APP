class Order < ApplicationRecord
  belongs_to :buyer, class_name: 'User'
  belongs_to :shipping_address, class_name: 'Address', optional: true
  has_many :order_items, dependent: :destroy

  # searchkick callbacks: false

  enum :status, { pending: 0, paid: 1, shipped: 2, delivered: 3, cancelled: 4 }, default: 'pending'
  enum :payment_status, { unpaid: 0, processing: 1, paid: 2, failed: 3 }, default: 'unpaid', prefix: true

  include AASM

  aasm column: :status, enum: true do
    state :pending, initial: true
    state :paid
    state :shipped
    state :delivered
    state :cancelled

    event :pay do
      transitions from: :pending, to: :paid
    end

    event :ship do
      transitions from: :paid, to: :shipped
    end

    event :deliver do
      transitions from: :shipped, to: :delivered
    end

    event :cancel do
      transitions from: [:pending, :paid, :shipped], to: :cancelled
    end
  end

  before_create :calculate_total_amount

  def update_total!
    update(total_amount: order_items.sum(:total_price))
  end

  private

  def calculate_total_amount
    self.total_amount = order_items.sum(&:total_price) if total_amount.nil? || total_amount == 0
  end
end
