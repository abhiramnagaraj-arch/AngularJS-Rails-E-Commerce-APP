module Api
  module V1
    class SessionsController < Devise::SessionsController
      skip_before_action :authenticate_api_v1_user!, only: [:create], raise: false
      respond_to :json

      def create
        self.resource = User.find_by(email: params[:user][:email])
        if resource&.valid_password?(params[:user][:password])
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

      def respond_to_on_destroy
        render json: { message: 'Logged out successfully' }, status: :ok
      end
    end
  end
end