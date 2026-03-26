class Api::V1::ProductsController < ApplicationController
  load_and_authorize_resource

  def index
    # Fetch active products from non-suspended sellers
    @products = Product.joins(:seller).where(active: true, sellers: { suspended: false })
    if params[:category_id].present?
      category = Category.find_by(id: params[:category_id])
      if category
        category_ids = [category.id] + category.subcategories.pluck(:id)
        @products = @products.where(category_id: category_ids)
      else
        @products = @products.none
      end
    end
    
    if params[:query].present?
      term = "%#{params[:query].downcase}%"
      @products = @products.left_joins(:category).where(
        "LOWER(products.name) LIKE :q OR LOWER(products.description) LIKE :q OR LOWER(categories.name) LIKE :q",
        q: term
      )
    end
    
    render json: @products.includes(:seller, :category).as_json(
      include: {
        seller: { only: [:id, :store_name] },
        category: { only: [:id, :name] }
      },
      methods: [:image_url]
    )
  end

  def show
    render json: @product.as_json(
      include: {
        category: { only: [:id, :name] },
        seller: { only: [:id, :store_name, :user_id] },
        reviews: { include: { user: { only: [:id, :email] } } }
      },
      methods: [:image_url]
    )
  end
end
