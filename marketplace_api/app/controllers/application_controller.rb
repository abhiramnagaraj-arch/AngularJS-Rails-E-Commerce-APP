class ApplicationController < ActionController::API
  include ActionController::MimeResponds
  include Devise::Controllers::Helpers
  # before_action :authenticate_api_v1_user! # Devise handles this

  def current_user
    current_api_v1_user
  end

  rescue_from CanCan::AccessDenied do |exception|
    render json: { error: exception.message }, status: :forbidden
  end
end