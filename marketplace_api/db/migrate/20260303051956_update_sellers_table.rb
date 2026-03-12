class UpdateSellersTable < ActiveRecord::Migration[8.1]
  def change
    rename_column :sellers, :description, :store_description
    add_column :sellers, :verification_status, :string, default: 'pending', null: false
  end
end
