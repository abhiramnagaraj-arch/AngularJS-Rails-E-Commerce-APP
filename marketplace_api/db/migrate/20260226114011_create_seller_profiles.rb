class CreateSellerProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :seller_profiles do |t|
      t.references :user, null: false, foreign_key: true
      t.string :store_name
      t.text :description

      t.timestamps
    end
  end
end
