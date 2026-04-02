class Ability
  include CanCan::Ability

  def initialize(user)
    # Public access for everyone
    can :read, Product, active: true
    can :read, Category
    can :read, Review

    return unless user.present?

    if user.admin?
      can :manage, :all
    else
      # Common permissions for both Buyer and Seller
      can :manage, Cart, user_id: user.id
      can :manage, Order, buyer_id: user.id
      can :create_payment_intent, Order
      can :create, Review, user_id: user.id

      if user.seller?
        if user.seller&.approved?
          can :manage, Product, seller_id: user.seller.id
          can :create, Product
          can :read, Order, order_items: { seller_id: user.seller.id }
          can :update, Order, order_items: { seller_id: user.seller.id }
          can :manage, OrderItem, seller_id: user.seller.id
          can [:billing, :update_bank_details], Seller, id: user.seller.id
        end
        can :manage, Seller, user_id: user.id
      elsif user.buyer?
        can :create, Seller
      end
    end
  end
end
