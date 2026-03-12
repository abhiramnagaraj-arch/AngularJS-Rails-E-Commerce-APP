class Api::V1::Admin::DashboardsController < Api::V1::Admin::BaseController
  def index
    completed_orders = Order.where(status: :completed)
    completed_order_items = OrderItem.joins(:order).where(orders: { status: :completed })
    
    stats = {
      total_users: User.count,
      seller_count: Seller.count,
      total_products: Product.count,
      total_orders: Order.count,
      total_revenue: completed_orders.sum(:total_amount), # Gross merchandise value
      total_platform_profit: completed_order_items.sum(:commission_amount), # Admin net earnings
      pending_seller_approvals: Seller.where(verification_status: 'pending').count
    }
    
    products = Product.includes(:seller, :category).limit(10)
    
    render json: { stats: stats, products: products }
  end
end
