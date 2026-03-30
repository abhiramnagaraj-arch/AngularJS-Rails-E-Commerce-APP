class CartItem < ApplicationRecord
  belongs_to :cart
  belongs_to :product
  validates :quantity, presence: true, numericality: { greater_than: 0 }

  before_save :set_total_price
  after_save :update_cart_total
  after_destroy :update_cart_total

  private

  def set_total_price
    self.total_price = ((quantity || 0) * (product&.price || 0))
  end

  def update_cart_total
    cart.update_total!
  end
end
