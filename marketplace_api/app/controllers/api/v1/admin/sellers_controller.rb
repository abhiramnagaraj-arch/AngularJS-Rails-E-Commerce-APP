class Api::V1::Admin::SellersController < Api::V1::Admin::BaseController
  load_and_authorize_resource

  include Paginatable
  
  def index
    scope = Seller.all.includes(:user)
    scope = scope.where(verification_status: params[:status]) if params[:status].present?
    scope = scope.where("store_name ILIKE ?", "%#{params[:store_name]}%") if params[:store_name].present?
    scope = scope.where(reactivation_requested: true) if params[:only_reactivation] == 'true'
    
    result = paginate(scope)
    
    sellers_data = result[:data].as_json(include: :user)
    render_success(sellers_data, "Sellers fetched successfully", :ok, meta: result[:meta])
  end

  def approve
    if @seller.update(verification_status: 'approved')
      render_success(@seller, "Seller approved")
    else
      render_error("Failed to approve seller", @seller.errors.full_messages)
    end
  end

  def reject
    if @seller.update(verification_status: 'rejected')
      render_success(@seller, "Seller rejected")
    else
      render_error("Failed to reject seller", @seller.errors.full_messages)
    end
  end

  def suspend
    if @seller.update(suspended: true)
      render_success(@seller, "Seller suspended")
    else
      render_error("Failed to suspend seller", @seller.errors.full_messages)
    end
  end

  def reactivate
    if @seller.update(suspended: false, reactivation_requested: false)
      render_success(@seller, "Seller reactivated")
    else
      render_error("Failed to reactivate seller", @seller.errors.full_messages)
    end
  end
end
