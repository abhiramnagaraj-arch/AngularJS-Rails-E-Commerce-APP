module Api
  module V1
    module Admin
      class ReviewsController < ApplicationController
        before_action :authenticate_api_v1_user!
        load_and_authorize_resource

        def index
          @reviews = Review.includes(:user, product: :category)
          render json: @reviews.as_json(
            include: {
              user: { only: [:id, :email] },
              product: { 
                only: [:id, :name],
                include: { category: { only: [:id, :name] } }
              }
            }
          )
        end

        def destroy
          if @review.destroy
            render json: { message: 'Review deleted successfully' }
          else
            render json: { error: 'Failed to delete review' }, status: :unprocessable_entity
          end
        end
      end
    end
  end
end
