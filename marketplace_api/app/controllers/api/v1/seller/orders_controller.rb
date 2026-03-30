class Api::V1::Seller::OrdersController < ApplicationController
  before_action :authenticate_api_v1_user!
  
  def index
    seller_id = current_user.seller.id
    
    # Fetch Master Orders that contain at least one item sold by this seller
    @orders = Order.joins(:order_items)
                   .where(order_items: { seller_id: seller_id })
                   .distinct
                   .includes(:buyer, :shipping_address, order_items: { product: :seller })

    # We need to filter the serialized output so that ONLY the seller's items are returned
    serialized_orders = @orders.map do |order|
      order_hash = order.as_json(include: { 
        buyer: { only: [:id, :email] },
        shipping_address: {}
      })
      
      seller_items = order.order_items.select { |item| item.seller_id == seller_id }
      
      order_hash['order_items'] = seller_items.as_json(include: { product: { include: :seller } })
      order_hash['seller_total'] = seller_items.sum { |item| item.price_at_purchase * item.quantity }
      order_hash
    end

    render json: serialized_orders
  end

  def show
    order = Order.find(params[:id])
    @order_items = order.order_items.where(seller: current_user.seller).includes(:product)
    
    render json: order.as_json.merge(order_items: @order_items)
  end

  def update_status
    @order_item = OrderItem.find(params[:id])
    authorize! :update, @order_item
    
    if @order_item.update(status: params[:status]) # Assuming we add status to OrderItem too
      render json: @order_item
    else
      render json: { errors: @order_item.errors.full_messages }, status: :unprocessable_entity
    end
  end
end
