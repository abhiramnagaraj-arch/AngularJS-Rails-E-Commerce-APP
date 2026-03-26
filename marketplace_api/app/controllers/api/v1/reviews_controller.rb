class Api::V1::ReviewsController < ApplicationController
  before_action :authenticate_api_v1_user!, only: [:create]

  def index
    if params[:product_id].present?
      @reviews = Review.where(product_id: params[:product_id]).includes(:user)
    else
      @reviews = Review.all.includes(:user)
    end
    render json: @reviews.as_json(include: { user: { only: [:id, :email] } })
  end

  def create
    @review = Review.new(review_params)
    @review.user = current_user
    @review.product_id = params[:product_id] if params[:product_id].present?
    
    authorize! :create, @review
    if @review.save
      render json: @review.as_json(include: { user: { only: [:id, :email] } }), status: :created
    else
      render json: { errors: @review.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def review_params
    params.require(:review).permit(:product_id, :rating, :comment)
  end
end