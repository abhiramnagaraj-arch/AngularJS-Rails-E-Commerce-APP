module Api
  module V1
    class SessionsController < Devise::SessionsController
      skip_before_action :authenticate_api_v1_user!, only: [:create], raise: false
      respond_to :json

      def create
        # Manually find and authenticate the user because Devise might be skipping it in API mode
        # or parameters might be wrapped incorrectly.
        Rails.logger.info "--- LOGIN PARAMS: #{params.inspect} ---"
        user_params = params[:user] || params[:session][:user] rescue nil
        email = user_params&.dig(:email)
        password = user_params&.dig(:password)

        self.resource = User.find_by(email: email)
        
        if resource&.valid_password?(password)
          # Use sign_in to trigger Devise callbacks and warden-jwt_auth hooks
          sign_in(resource_name, resource)
          yield resource if block_given?
          respond_with resource, location: after_sign_in_path_for(resource)
        else
          render json: { error: 'Invalid Email or password.' }, status: :unauthorized
        end
      end
      
      private

      def respond_with(resource, _opts = {})
        token = request.env['warden-jwt_auth.token']
        # Explicitly set header for convenience and debugging
        response.set_header('Authorization', "Bearer #{token}") if token
        Rails.logger.info "--- GENERATED TOKEN: #{token.present? ? 'PRESENT' : 'MISSING'} ---"
        render json: {
          message: 'Logged in successfully',
          token: token,
          user: {
            id: resource.id,
            email: resource.email,
            role: resource.role
          }
        }, status: :ok
      end

      def respond_to_on_destroy(resource = nil)
        render json: { message: 'Logged out successfully' }, status: :ok
      end
    end
  end
end