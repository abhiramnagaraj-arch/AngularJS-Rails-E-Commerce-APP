module Api
  module V1
    class SellersController < ApplicationController
      before_action :authenticate_api_v1_user!
      
      def stats
        seller = current_user.seller
        return render json: { error: "No seller profile found" }, status: :not_found unless seller

        authorize! :read, seller
        
        valid_statuses = [:paid, :shipped, :delivered]
        
        # Gross revenue for seller
        total_sales = OrderItem.joins(:order)
                               .where(seller: seller, orders: { status: valid_statuses })
                               .sum(:total_price)

        # Net earnings for seller (total_price - 10% commission)
        # Note: Already delivered items are in seller.net_earning, 
        # but we calculate dynamically to include paid/shipped items.
        total_earnings = OrderItem.joins(:order)
                                  .where(seller: seller, orders: { status: valid_statuses })
                                  .sum("total_price - commission_amount")

        stats = {
          total_products: seller.products.count,
          total_sales: total_sales,
          total_earnings: total_earnings,
          pending_orders: OrderItem.where(seller: seller, status: :pending).count,
          verification_status: seller.verification_status,
          store_name: seller.store_name,
          suspended: seller.suspended,
          reactivation_requested: seller.reactivation_requested
        }
        
        render json: stats
      end

      def request_reactivation
                            seller = current_user.seller
        return render json: { error: "No seller profile found" }, status: :not_found unless seller
        authorize! :update, seller

        unless seller.suspended
          return render json: { error: "Reactivation can only be requested for suspended accounts" }, status: :unprocessable_entity
        end

        if seller.update(reactivation_requested: true)
          render json: { message: "Reactivation requested successfully", seller: seller }
        else
          render json: { errors: seller.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def create
        return render json: { error: "Already a seller" }, status: :unprocessable_entity if current_user.seller.present?

        @seller = current_user.build_seller(seller_params)
        @seller.verification_status = 'approved' if current_user.admin?
        authorize! :create, @seller

        if @seller.save
          current_user.update(role: :seller) if current_user.buyer?

          render json: {
            message: "Seller profile created successfully",
            seller: @seller
          }, status: :created
        else
          render json: { errors: @seller.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def billing
        seller = current_user.seller
        return render json: { error: "No seller profile found" }, status: :not_found unless seller
        authorize! :billing, seller

        render json: {
          invoices: seller.invoices.order(billing_date: :desc),
          bank_details: {
            bank_name: seller.bank_name,
            account_number: seller.account_number,
            ifsc_code: seller.ifsc_code,
            account_holder_name: seller.account_holder_name
          }
        }
      end

      def update_bank_details
        seller = current_user.seller
        return render json: { error: "No seller profile found" }, status: :not_found unless seller
        authorize! :update_bank_details, seller

        if seller.update(bank_params)
          render json: { message: "Bank details updated successfully", seller: seller }
        else
          render json: { errors: seller.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def seller_params
        params.require(:seller).permit(:store_name, :store_description)
      end

      def bank_params
        params.require(:seller).permit(:bank_name, :account_number, :ifsc_code, :account_holder_name)
      end
    end
  end
end