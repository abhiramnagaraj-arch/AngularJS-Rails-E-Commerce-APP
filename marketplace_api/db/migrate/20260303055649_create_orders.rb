class CreateOrders < ActiveRecord::Migration[8.1]
  def change
    create_table :orders do |t|
      t.references :buyer, null: false, foreign_key: { to_table: :users }
      t.decimal :total_amount
      t.integer :status
      t.integer :payment_status
      t.string :stripe_payment_intent_id

      t.timestamps
    end
  end
end
