class Cart < ApplicationRecord
  belongs_to :user
  has_many :cart_items, dependent: :destroy
  has_many :products, through: :cart_items

  def update_total!
    update(total_amount: cart_items.sum(:total_price))
  end
end
