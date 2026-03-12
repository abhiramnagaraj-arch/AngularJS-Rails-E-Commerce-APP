class Api::V1::CartsController < ApplicationController
  before_action :authenticate_api_v1_user!
  before_action :set_cart
  authorize_resource class: "Cart"

  def show
    render json: @cart.as_json(include: { cart_items: { include: :product } })
  end

  def add_item
    product = Product.find(params[:product_id])
    requested_quantity = params[:quantity].to_i > 0 ? params[:quantity].to_i : 1

    cart_item = @cart.cart_items.find_or_initialize_by(product: product)
    new_total_quantity = (cart_item.quantity || 0) + requested_quantity

    if new_total_quantity > product.stock_quantity
      return render json: { error: "Out of Stock. Only #{product.stock_quantity} available." }, status: :unprocessable_entity
    end

    cart_item.quantity = new_total_quantity
    
    if cart_item.save
      render json: @cart.as_json(include: { cart_items: { include: :product } }), status: :ok
    else
      render json: { errors: cart_item.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update_item
    cart_item = @cart.cart_items.find(params[:id])
    requested_quantity = params[:quantity].to_i

    if requested_quantity <= 0
      cart_item.destroy
      return render json: @cart.as_json(include: { cart_items: { include: :product } })
    end

    if requested_quantity > cart_item.product.stock_quantity
      return render json: { error: "Out of Stock. Only #{cart_item.product.stock_quantity} available." }, status: :unprocessable_entity
    end

    if cart_item.update(quantity: requested_quantity)
      render json: @cart.as_json(include: { cart_items: { include: :product } })
    else
      render json: { errors: cart_item.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def remove_item
    cart_item = @cart.cart_items.find(params[:id])
    cart_item.destroy
    render json: @cart.as_json(include: { cart_items: { include: :product } })
  end

  private

  def set_cart
    @cart = current_user.cart || current_user.create_cart!
  end
end
