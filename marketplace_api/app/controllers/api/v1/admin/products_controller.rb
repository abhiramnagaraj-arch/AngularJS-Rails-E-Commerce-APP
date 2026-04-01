class Api::V1::Admin::ProductsController < Api::V1::Admin::BaseController
  load_and_authorize_resource

  include Paginatable

  def index
    scope = Product.where(active: true).includes(:seller, :category)
    
    # 1. Hierarchical Category Filter
    if params[:category_id].present?
      category = Category.find_by(id: params[:category_id])
      if category
        category_ids = [category.id] + category.subcategories.pluck(:id)
        scope = scope.where(category_id: category_ids)
      else
        scope = scope.none
      end
    end

    # 2. Search Filter
    if params[:search].present?
      term = "%#{params[:search].downcase}%"
      scope = scope.left_joins(:category).where(
        "LOWER(products.name) LIKE :q OR LOWER(products.description) LIKE :q OR LOWER(categories.name) LIKE :q",
        q: term
      )
    end
    
    result = paginate(scope)
    
    products_data = result[:data].as_json(
      include: {
        seller: { only: [:id, :store_name] },
        category: { only: [:id, :name, :parent_id] }
      },
      methods: [:image_url, :image]
    )
    render_success(products_data, "Products fetched successfully", :ok, meta: result[:meta])
  end

  def create
    @product = Product.new(product_params)
    
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
    params.require(:product).permit(:name, :description, :price, :stock_quantity, :category_id, :seller_id, :image)
  end
end
