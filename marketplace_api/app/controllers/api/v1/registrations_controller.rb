module Api
  module V1
    class RegistrationsController < Devise::RegistrationsController
      respond_to :json

      def create
        build_resource(sign_up_params)

        if params[:user][:become_seller] == true || params[:user][:become_seller] == 'true'
          resource.role = :seller
        end

        resource.save
        if resource.persisted?
          if resource.active_for_authentication?
            sign_up(resource_name, resource)
          end
        end
        yield resource if block_given?
        respond_with(resource)
      end

      private

      def sign_up_params
        params.require(:user).permit(:email, :password, :password_confirmation)
      end

      def respond_with(resource, _opts = {})
        if resource.persisted?
          render json: {
            message: "Signed up successfully",
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