class Api::V1::Seller::OrdersController < ApplicationController
  include Paginatable
  before_action :authenticate_api_v1_user!
  
  def index
    seller_id = current_user.seller.id
    
    # Fetch Master Orders that contain at least one item sold by this seller
    scope = Order.joins(:order_items)
                   .where(order_items: { seller_id: seller_id })
                   .distinct
                   .includes(:buyer, :shipping_address, order_items: { product: :seller })
                   .order(created_at: :desc)

    result = paginate(scope)
    
    # We need to filter the serialized output so that ONLY the seller's items are returned
    serialized_orders = result[:data].map do |order|
      order_hash = order.as_json(include: { 
        buyer: { only: [:id, :email] },
        shipping_address: {}
      })
      
      seller_items = order.order_items.select { |item| item.seller_id == seller_id }
      
      order_hash['order_items'] = seller_items.as_json(include: { product: { include: :seller, methods: [:image_url, :image] } })
      order_hash['seller_total'] = seller_items.sum { |item| item.price_at_purchase * item.quantity }
      order_hash
    end

    render_success(serialized_orders, "Orders fetched successfully", :ok, meta: result[:meta])
  end

  def show
    order = Order.find(params[:id])
    @order_items = order.order_items.where(seller: current_user.seller).includes(:product)
    
    render_success(order.as_json.merge(
      order_items: @order_items.as_json(include: { product: { methods: [:image_url, :image] } })
    ))
  end

  def update_status
    @order_item = OrderItem.find(params[:id])
    authorize! :update, @order_item
    
    if @order_item.update(status: params[:status])
      render_success(@order_item, "Status updated")
    else
      render_error("Failed to update status", @order_item.errors.full_messages)
    end
  end
end
