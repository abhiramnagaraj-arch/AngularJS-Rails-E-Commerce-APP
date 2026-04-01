  class Api::V1::CartsController < ApplicationController
    before_action :authenticate_api_v1_user!
    before_action :set_cart
    authorize_resource class: "Cart"

    def show
      render_success(@cart.as_json(
        methods: [:total_price], 
        include: { 
          cart_items: { 
            methods: [:total_price], 
            include: { product: { methods: [:image_url, :image] } }
          } 
        }
      ))
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
        render_success(@cart.as_json(
          methods: [:total_price], 
          include: { 
            cart_items: { 
              methods: [:total_price], 
              include: { product: { methods: [:image_url, :image] } }
            } 
          }
        ), "Item added to cart")
      else
        render_error("Failed to add item", cart_item.errors.full_messages)
      end
    end

    def update_item
      cart_item = @cart.cart_items.find(params[:id])
      requested_quantity = params[:quantity].to_i

      if requested_quantity <= 0
        cart_item.destroy
        return render_success(@cart.as_json(
          methods: [:total_price], 
          include: { 
            cart_items: { 
              methods: [:total_price], 
              include: { product: { methods: [:image_url, :image] } }
            } 
          }
        ), "Item removed")
      end

      if requested_quantity > cart_item.product.stock_quantity
        return render json: { error: "Out of Stock. Only #{cart_item.product.stock_quantity} available." }, status: :unprocessable_entity
      end

      if cart_item.update(quantity: requested_quantity)
        render_success(@cart.as_json(
          methods: [:total_price], 
          include: { 
            cart_items: { 
              methods: [:total_price], 
              include: { product: { methods: [:image_url, :image] } }
            } 
          }
        ), "Quantity updated")
      else
        render_error("Failed to update quantity", cart_item.errors.full_messages)
      end
    end

    def remove_item
      cart_item = @cart.cart_items.find(params[:id])
      cart_item.destroy
      render_success(@cart.as_json(
        methods: [:total_price], 
        include: { 
          cart_items: { 
            methods: [:total_price], 
            include: { product: { methods: [:image_url, :image] } }
          } 
        }
      ), "Item removed")
    end

    private

    def set_cart
      @cart = current_user.cart || current_user.create_cart!
      # Eager load items and products to avoid N+1
      @cart = Cart.includes(cart_items: :product).find(@cart.id)
    end
  end
