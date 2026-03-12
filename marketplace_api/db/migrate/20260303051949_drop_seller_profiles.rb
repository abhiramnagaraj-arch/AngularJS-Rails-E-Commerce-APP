class DropSellerProfiles < ActiveRecord::Migration[8.1]
  def up
    drop_table :seller_profiles, if_exists: true
  end

  def down
    create_table :seller_profiles do |t|
      t.text :description
      t.string :store_name
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
