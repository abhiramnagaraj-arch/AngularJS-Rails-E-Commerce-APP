class Api::V1::Admin::SellersController < Api::V1::Admin::BaseController
  load_and_authorize_resource

  def index
    render json: @sellers.as_json(include: :user)
  end

  def approve
    if @seller.update(verification_status: 'approved')
      render json: { message: "Seller approved", seller: @seller }
    else
      render json: { errors: @seller.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def reject
    if @seller.update(verification_status: 'rejected')
      render json: { message: "Seller rejected", seller: @seller }
    else
      render json: { errors: @seller.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def suspend
    if @seller.update(suspended: true)
      render json: { message: "Seller suspended", seller: @seller }
    else
      render json: { errors: @seller.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def reactivate
    if @seller.update(suspended: false, reactivation_requested: false)
      render json: { message: "Seller reactivated", seller: @seller }
    else
      render json: { errors: @seller.errors.full_messages }, status: :unprocessable_entity
    end
  end
end
