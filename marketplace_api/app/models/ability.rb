class Ability
  include CanCan::Ability

  def initialize(user)
    # Explicitly allow public access to some actions for EVERYONE
    can :read, Product, active: true
    can :read, Category
    can :read, Review

    return unless user.present?

    if user.admin?
      can :manage, :all
    elsif user.seller?
      if user.seller&.approved?
        can :manage, Product, seller_id: user.seller.id
        can :create, Product
        can :read, Order, order_items: { seller_id: user.seller.id }
        can :update, Order, order_items: { seller_id: user.seller.id }
        can :manage, OrderItem, seller_id: user.seller.id
        can [:billing, :update_bank_details], Seller, id: user.seller.id
      end
      can :manage, Seller, user_id: user.id
      can :read, Product, active: true
      can :read, Category
      can :manage, Cart, user_id: user.id
      can :manage, Order, buyer_id: user.id
      can :create_payment_intent, Order
      can :create, Review, user_id: user.id
      can :read, Review
    elsif user.buyer?
      can :read, Product, active: true
      can :read, Category
      can :manage, Cart, user_id: user.id
      can :manage, Order, buyer_id: user.id
      can :create_payment_intent, Order
      can :create, Review, user_id: user.id
      can :read, Review
      can :create, Seller
    end
  end
end
