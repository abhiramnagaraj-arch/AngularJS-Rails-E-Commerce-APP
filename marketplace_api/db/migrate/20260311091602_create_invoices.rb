class CreateInvoices < ActiveRecord::Migration[8.1]
  def change
    create_table :invoices do |t|
      t.references :seller, null: false, foreign_key: true
      t.decimal :total_amount
      t.decimal :commission_total
      t.decimal :net_payout
      t.integer :status
      t.datetime :billing_date

      t.timestamps
    end
  end
end
