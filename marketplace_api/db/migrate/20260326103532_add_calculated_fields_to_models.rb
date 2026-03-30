class AddCalculatedFieldsToModels < ActiveRecord::Migration[8.1]
  def change
    add_column :cart_items, :total_price, :decimal, precision: 10, scale: 2, default: 0.0
    add_column :carts, :total_amount, :decimal, precision: 10, scale: 2, default: 0.0
    add_column :order_items, :total_price, :decimal, precision: 10, scale: 2, default: 0.0
    add_column :sellers, :net_earning, :decimal, precision: 10, scale: 2, default: 0.0
  end
end
