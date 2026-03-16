class ApplicationController < ActionController::API
  include ActionController::MimeResponds
  include Devise::Controllers::Helpers
  # before_action :authenticate_api_v1_user! # Devise handles this

  prepend_before_action :force_json_format
  before_action :log_auth_header

  private

  def force_json_format
    request.format = :json
  end

  def log_auth_header
    Rails.logger.info "--- AUTH HEADER: #{request.headers['Authorization']} ---"
  end

  def current_user
    current_api_v1_user
  end

  rescue_from CanCan::AccessDenied do |exception|
    render json: { error: exception.message }, status: :forbidden
  end
end