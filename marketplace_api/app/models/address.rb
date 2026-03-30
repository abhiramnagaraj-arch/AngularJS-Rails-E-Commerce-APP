class Address < ApplicationRecord
  belongs_to :user

  validates :name, :street, :city, :state, presence: true
  validates :phone, presence: true, length: { is: 10 }, numericality: { only_integer: true }
  validates :zip, presence: true, length: { is: 6 }
end
