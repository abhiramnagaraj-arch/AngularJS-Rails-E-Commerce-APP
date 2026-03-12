class Invoice < ApplicationRecord
  belongs_to :seller
  has_many :order_items

  enum :status, { pending: 0, paid: 1 }, default: 'pending'
end
