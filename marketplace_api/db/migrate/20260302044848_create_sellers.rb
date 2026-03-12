class CreateSellers < ActiveRecord::Migration[8.1]
  def change
    create_table :sellers do |t|
      t.string :store_name
      t.text :description
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
