class Api::V1::Admin::CategoriesController < Api::V1::Admin::BaseController
  load_and_authorize_resource

  def index
    @categories = @categories.where(parent_id: nil).includes(:subcategories)
    render json: @categories.as_json(include: :subcategories)
  end

  def show
    render json: @category.as_json(include: :subcategories)
  end

  def create
    if @category.save
      render json: @category, status: :created
    else
      render json: { errors: @category.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @category.update(category_params)
      render json: @category
    else
      render json: { errors: @category.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @category.destroy
    head :no_content
  end

  private

  def category_params
    params.require(:category).permit(:name, :parent_id)
  end
end
