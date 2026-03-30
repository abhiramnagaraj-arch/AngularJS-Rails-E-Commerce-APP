class Seller < ApplicationRecord
  belongs_to :user
  has_many :products, dependent: :destroy
  has_many :order_items
  has_many :invoices
  # Changed default from 'approved' to 'pending' to restore verification flow
  # enum :verification_status, { pending: 'pending', approved: 'approved', rejected: 'rejected' }, default: 'approved'
  enum :verification_status, { pending: 'pending', approved: 'approved', rejected: 'rejected', suspended: 'suspended' }, default: 'pending'

  include AASM

  aasm column: :verification_status, enum: true do
    state :pending, initial: true
    state :approved
    state :rejected
    state :suspended

    event :approve do
      transitions from: [:pending, :suspended, :rejected], to: :approved
    end

    event :reject do
      transitions from: :pending, to: :rejected
    end

    event :suspend do
      transitions from: :approved, to: :suspended
    end

    event :reactivate do
      transitions from: :suspended, to: :pending, after: :clear_reactivation_request
    end
  end

  validates :store_name, presence: true
  validates :store_description, presence: true
  validates :verification_status, presence: true

  def credit_account!(amount)
    with_lock do
      update!(net_earning: (net_earning || 0.0) + amount)
    end
  end

  private

  def clear_reactivation_request
    update(reactivation_requested: false) if reactivation_requested?
  end
end
