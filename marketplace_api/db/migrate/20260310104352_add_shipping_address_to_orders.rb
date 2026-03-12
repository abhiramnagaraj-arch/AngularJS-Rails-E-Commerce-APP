class AddShippingAddressToOrders < ActiveRecord::Migration[8.1]
  def change
    add_reference :orders, :shipping_address, foreign_key: { to_table: :addresses }
  end
end
