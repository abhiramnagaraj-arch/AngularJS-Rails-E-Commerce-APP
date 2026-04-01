class Api::V1::Seller::ProductsController < ApplicationController
  before_action :authenticate_api_v1_user!
  before_action :ensure_seller_profile!
  before_action :set_product, only: [:show, :update, :destroy]
  load_and_authorize_resource except: [:show, :update, :destroy]

  include Paginatable

  def index
    scope = current_user.admin? ? Product.where(active: true) : current_user.seller.products.where(active: true)
    result = paginate(scope.includes(:seller, :category))
    
    products_data = result[:data].as_json(
      methods: [:image_url, :image],
      include: {
        seller: { only: [:id, :store_name] },
        category: { only: [:id, :name] },
        reviews: { include: { user: { only: [:id, :email] } } }
      }
    )
    render_success(products_data, "Products fetched successfully", :ok, meta: result[:meta])
  end

  def show
    render_success(@product.as_json(methods: [:image_url, :image]))
  end

  def ensure_seller_profile!
    unless current_user.seller
      render_error("No seller profile found. Please create one first.", [], :not_found)
    end
  end

  def create
    @product.seller = current_user.seller
    if @product.save
      render_success(@product.as_json(methods: [:image_url, :image]), "Product created successfully", :created)
    else
      render_error("Failed to create product", @product.errors.full_messages)
    end
  end

  def update
    if @product.update(product_params)
      render_success(@product.as_json(methods: [:image_url, :image]), "Product updated successfully")
    else
      render_error("Failed to update product", @product.errors.full_messages)
    end
  end

  def destroy
    @product.update(active: false)
    head :no_content
  end

  private

  def product_params
    params.require(:product).permit(:name, :description, :price, :stock_quantity, :category_id, :active, :image)
  end

  def set_product
    @product = current_user.admin? ? Product.find(params[:id]) : current_user.seller.products.find(params[:id])
  end
end
