class Api::V1::CategoriesController < ApplicationController
  load_and_authorize_resource

  def index
    # Only show top-level categories by default or filter as needed
    @categories = @categories.where(parent_id: nil).includes(:subcategories)
    render json: @categories.as_json(include: :subcategories)
  end

  def show
    render json: @category.as_json(include: :subcategories)
  end
end
