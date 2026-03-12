class User < ApplicationRecord
  enum :role, { buyer: 0, seller: 1, admin: 2 }
  has_one :seller, dependent: :destroy
  has_one :cart, dependent: :destroy
  has_many :orders, foreign_key: :buyer_id, dependent: :destroy
  devise :database_authenticatable,
         :registerable,
         :jwt_authenticatable,
         jwt_revocation_strategy: JwtDenylist

  validates :email, presence: true, uniqueness: true
  has_many :reviews, dependent: :destroy
  has_many :addresses, dependent: :destroy
end