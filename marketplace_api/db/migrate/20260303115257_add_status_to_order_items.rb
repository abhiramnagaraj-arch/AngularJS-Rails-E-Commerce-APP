class AddStatusToOrderItems < ActiveRecord::Migration[8.1]
  def change
    add_column :order_items, :status, :integer
  end
end
