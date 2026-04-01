class Api::V1::CategoriesController < ApplicationController
  load_and_authorize_resource

  include Paginatable

  def index
    # Only show top-level categories by default or filter as needed
    scope = Category.where(parent_id: nil).includes(:subcategories)
    result = paginate(scope)
    
    categories_data = result[:data].as_json(include: :subcategories)
    render_success(categories_data, "Categories fetched successfully", :ok, meta: result[:meta])
  end

  def show
    render_success(@category.as_json(include: :subcategories))
  end
end
