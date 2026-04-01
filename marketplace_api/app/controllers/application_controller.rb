class ApplicationController < ActionController::API
  include ActionController::MimeResponds
  include Devise::Controllers::Helpers

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

  # ✅ FIXED: Backward-compatible + flexible response
  def render_success(data = {}, message = "Success", status = :ok, meta: nil)
    response = {
      success: true,
      message: message,
      data: data
    }

    # ✅ Add pagination meta if present
    response[:meta] = meta if meta.present?

    # ✅ BACKWARD COMPATIBILITY (CRITICAL FIX)
    # If data is an array, expose it as plural key (products, orders, etc.)
    if data.is_a?(Array)
      resource_name = controller_name # "products", "orders"
      response[resource_name] = data
    end

    render json: response, status: status
  end

  # ✅ IMPROVED ERROR HANDLING
  def render_error(message = "Something went wrong", errors = [], status = :unprocessable_entity)
    render json: {
      success: false,
      message: message,
      errors: errors.presence || []
    }, status: status
  end

  # ✅ CONSISTENT AUTH ERROR FORMAT
  rescue_from CanCan::AccessDenied do |exception|
    render_error(exception.message, [], :forbidden)
  end

  # ✅ OPTIONAL (VERY USEFUL): Catch unexpected crashes
  rescue_from StandardError do |exception|
    Rails.logger.error "🔥 ERROR: #{exception.message}"
    Rails.logger.error exception.backtrace.join("\n")

    render_error("Internal server error", [], :internal_server_error)
  end
end