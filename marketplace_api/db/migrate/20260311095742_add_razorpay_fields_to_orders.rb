class AddRazorpayFieldsToOrders < ActiveRecord::Migration[8.1]
  def change
    add_column :orders, :razorpay_order_id, :string
    add_column :orders, :razorpay_payment_id, :string
    add_column :orders, :razorpay_signature, :string
  end
end
