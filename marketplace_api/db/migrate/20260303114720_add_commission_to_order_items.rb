class AddCommissionToOrderItems < ActiveRecord::Migration[8.1]
  def change
    add_column :order_items, :commission_amount, :decimal
  end
end
