class Api::V1::Admin::DashboardsController < Api::V1::Admin::BaseController
  skip_authorization_check # Admin dashboard is global oversight, authentication handled by BaseController

  def index
    begin
      Rails.logger.info "[ADMIN_DASHBOARD] Fetching stats..."
      # Use ActiveRecord for reliable counts and sums
      valid_statuses = ['paid', 'shipped', 'delivered']
      
      stats = {
        total_users: User.count,
        seller_count: Seller.count,
        total_products: Product.count,
        total_orders: Order.where(status: valid_statuses).count,
        total_revenue: Order.where(status: valid_statuses).sum(:total_amount).to_f,
        total_platform_profit: OrderItem.joins(:order)
                                        .where(orders: { status: valid_statuses })
                                        .sum(:commission_amount).to_f,
        active_sellers: Seller.count,
        total_categories: Category.count,
        pending_seller_approvals: Seller.where(verification_status: 'pending').count
      }
      
      Rails.logger.info "[ADMIN_DASHBOARD] Stats collected: #{stats.inspect}"

      # Try Searchkick for products, fallback to ActiveRecord
      begin
        products = Product.search("*", includes: [:seller, :category], limit: 10).to_a
      rescue StandardError => e
        Rails.logger.warn "[ADMIN_DASHBOARD] Searchkick failed, falling back: #{e.message}"
        products = Product.includes(:seller, :category).limit(10)
      end
    rescue StandardError => e
      Rails.logger.error "[ADMIN_DASHBOARD] Critical error: #{e.message}"
      stats = { error: e.message }
      products = []
    end
    
    render json: { 
      stats: stats, 
      products: products.as_json(
        include: {
          seller: { only: [:id, :store_name] },
          category: { only: [:id, :name, :parent_id] }
        },
        methods: [:image_url]
      )
    }
  end
end
