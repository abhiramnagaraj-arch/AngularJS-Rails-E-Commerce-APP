class Order < ApplicationRecord
  belongs_to :buyer, class_name: 'User'
  belongs_to :shipping_address, class_name: 'Address', optional: true
  has_many :order_items, dependent: :destroy

  enum :status, { pending: 0, paid: 1, shipped: 2, delivered: 3, cancelled: 4 }, default: 'pending'
  enum :payment_status, { unpaid: 0, processing: 1, paid: 2, failed: 3 }, default: 'unpaid', prefix: true
end
