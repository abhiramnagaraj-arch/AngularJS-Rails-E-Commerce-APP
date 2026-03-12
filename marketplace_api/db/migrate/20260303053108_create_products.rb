class CreateProducts < ActiveRecord::Migration[8.1]
  def change
    create_table :products do |t|
      t.references :seller, null: false, foreign_key: true
      t.references :category, null: false, foreign_key: true
      t.string :name
      t.text :description
      t.decimal :price
      t.integer :stock_quantity
      t.boolean :active

      t.timestamps
    end
  end
end
