class Api::V1::AddressesController < ApplicationController
  before_action :authenticate_api_v1_user!

  def index
    render_success(current_user.addresses)
  end

  def create
    @address = current_user.addresses.build(address_params)
    
    # If this is the first address or explicitly set to default, make it default
    if @address.is_default || current_user.addresses.count == 0
      @address.is_default = true
      current_user.addresses.where.not(id: @address.id).update_all(is_default: false)
    end

    if @address.save
      render_success(@address, "Address created", :created)
    else
      render_error("Failed to create address", @address.errors.full_messages)
    end
  end

  def destroy
    @address = current_user.addresses.find(params[:id])
    @address.destroy
    head :no_content
  end

  def update
    @address = current_user.addresses.find(params[:id])
    
    if address_params[:is_default]
      current_user.addresses.where.not(id: @address.id).update_all(is_default: false)
    end

    if @address.update(address_params)
      render_success(@address, "Address updated")
    else
      render_error("Failed to update address", @address.errors.full_messages)
    end
  end

  private

  def address_params
    params.require(:address).permit(:name, :phone, :street, :city, :state, :zip, :country, :is_default)
  end
end
