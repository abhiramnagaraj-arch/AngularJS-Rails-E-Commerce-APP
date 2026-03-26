class Seller < ApplicationRecord
  belongs_to :user
  has_many :products, dependent: :destroy
  has_many :order_items
  has_many :invoices
  # Changed default from 'approved' to 'pending' to restore verification flow
  # enum :verification_status, { pending: 'pending', approved: 'approved', rejected: 'rejected' }, default: 'approved'
  enum :verification_status, { pending: 'pending', approved: 'approved', rejected: 'rejected' }, default: 'pending'


  validates :store_name, presence: true
  validates :store_description, presence: true
  validates :verification_status, presence: true
end
