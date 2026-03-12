class Api::V1::Admin::ProductsController < Api::V1::Admin::BaseController
  load_and_authorize_resource

  def index
    render json: @products.where(active: true).includes(:seller, :category).as_json(
      include: {
        seller: { only: [:id, :store_name] },
        category: { only: [:id, :name] }
      },
      methods: [:image_url]
    )
  end

  def create
    @product = Product.new(product_params)
    
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
    params.require(:product).permit(:name, :description, :price, :stock_quantity, :category_id, :seller_id, :image)
  end
end
