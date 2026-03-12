class Api::V1::Seller::ProductsController < ApplicationController
  before_action :authenticate_api_v1_user!
  before_action :ensure_seller_profile!
  before_action :set_product, only: [:show, :update, :destroy]
  load_and_authorize_resource except: [:show, :update, :destroy]

  def index
    @products = current_user.admin? ? Product.where(active: true) : current_user.seller.products.where(active: true)
    render json: @products.as_json(
      methods: [:image_url],
      include: {
        reviews: { include: { user: { only: [:id, :email] } } }
      }
    )
  end

  def show
    render json: @product.as_json(methods: [:image_url])
  end

  def ensure_seller_profile!
    unless current_user.seller
      render json: { error: "No seller profile found. Please create one first." }, status: :not_found
    end
  end

  def create
    @product.seller = current_user.seller
    if @product.save
      render json: @product.as_json(methods: [:image_url]), status: :created
    else
      render json: { errors: @product.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @product.update(product_params)
      render json: @product.as_json(methods: [:image_url])
    else
      render json: { errors: @product.errors.full_messages }, status: :unprocessable_entity
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
