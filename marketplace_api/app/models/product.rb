class Product < ApplicationRecord
  belongs_to :seller
  belongs_to :category

  has_one_attached :image

  validates :name, presence: true
  validates :price, presence: true, numericality: { greater_than: 0 }
  validates :stock_quantity, presence: true, numericality: { greater_than_or_equal_to: 0 }
  has_many :reviews, dependent: :destroy

  def image_url
    if image.attached?
      Rails.application.routes.url_helpers.rails_blob_url(image, host: 'localhost:3000')
    end
  end
end
