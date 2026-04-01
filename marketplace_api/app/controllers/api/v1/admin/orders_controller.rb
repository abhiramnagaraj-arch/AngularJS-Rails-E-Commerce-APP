class Api::V1::Admin::OrdersController < Api::V1::Admin::BaseController
  include Paginatable
  load_and_authorize_resource

  def index
    scope = Order.all.includes(:buyer, :shipping_address, order_items: :product)
    result = paginate(scope)
    
    orders_data = result[:data].as_json(include: { 
      buyer: { only: [:id, :email] },
      shipping_address: {},
      order_items: { include: { product: { methods: [:image_url] } } } 
    })

    render_success(orders_data, "Orders fetched successfully", :ok, meta: result[:meta])
  end

  def update
    if @order.update(order_params)
      render json: @order
    else
      render json: { errors: @order.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def order_params
    params.permit(:status, :payment_status)
  end
end
