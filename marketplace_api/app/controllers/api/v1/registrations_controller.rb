module Api
  module V1
    class RegistrationsController < Devise::RegistrationsController
      respond_to :json

      def create
        super do |resource|
          if params[:user][:become_seller] == true || params[:user][:become_seller] == 'true'
            resource.update(role: :seller)
          end
        end
      end

      private

      def sign_up_params
        params.require(:user).permit(:email, :password, :password_confirmation)
      end

      def respond_with(resource, _opts = {})
        if resource.persisted?
          token = request.env['warden-jwt_auth.token']
          # Explicitly set header for convenience and debugging
          response.set_header('Authorization', "Bearer #{token}") if token
          Rails.logger.info "--- GENERATED TOKEN (Signup): #{token.present? ? 'PRESENT' : 'MISSING'} ---"
          render json: {
            message: "Signed up successfully",
            token: token,
            user: {
              id: resource.id,
              email: resource.email,
              role: resource.role
            }
          }, status: :ok
        else
          render json: {
            message: "Signup failed",
            errors: resource.errors.full_messages
          }, status: :unprocessable_entity
        end
      end
    end
  end
end