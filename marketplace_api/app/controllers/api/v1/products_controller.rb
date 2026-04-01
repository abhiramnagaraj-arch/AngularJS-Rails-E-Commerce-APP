class Api::V1::ProductsController < ApplicationController
  include Paginatable
  load_and_authorize_resource

  def index
    # Fetch active products from non-suspended sellers
    scope = Product.joins(:seller).where(active: true, sellers: { suspended: false })
    # Category filter (includes subcategories)
    if params[:category_id].present?
      category = Category.find_by(id: params[:category_id])
      if category
        category_ids = [category.id] + category.subcategories.pluck(:id)
        scope = scope.where(category_id: category_ids)
      else
        scope = scope.none
      end
    end
    
    # Search filter (name or description)
    if params[:search].present? || params[:query].present?
      term = "%#{(params[:search] || params[:query]).downcase}%"
      scope = scope.left_joins(:category).where(
        "LOWER(products.name) LIKE :q OR LOWER(products.description) LIKE :q OR LOWER(categories.name) LIKE :q",
        q: term
      )
    end

    # Price range filters
    scope = scope.where("products.price >= ?", params[:min_price]) if params[:min_price].present?
    scope = scope.where("products.price <= ?", params[:max_price]) if params[:max_price].present?

    # Sorting
    case params[:sort]
    when 'price_asc'
      scope = scope.order(price: :asc)
    when 'price_desc'
      scope = scope.order(price: :desc)
    else
      scope = scope.order(created_at: :desc)
    end

    result = paginate(scope.includes(:seller, :category).distinct, per_page: 8)
    
    products_data = result[:data].as_json(
      include: {
        seller: { only: [:id, :store_name] },
        category: { only: [:id, :name] }
      },
      methods: [:image_url, :image]
    )

    render_success(products_data, "Products fetched successfully", :ok, meta: result[:meta])
  end

  def show
    product_data = @product.as_json(
      include: {
        category: { only: [:id, :name] },
        seller: { only: [:id, :store_name, :user_id] },
        reviews: { include: { user: { only: [:id, :email] } } }
      },
      methods: [:image_url, :image]
    )
    render_success(product_data)
  end
end
