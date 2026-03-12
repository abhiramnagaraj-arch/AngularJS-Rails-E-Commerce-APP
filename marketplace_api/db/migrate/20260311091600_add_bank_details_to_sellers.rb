class AddBankDetailsToSellers < ActiveRecord::Migration[8.1]
  def change
    add_column :sellers, :bank_name, :string
    add_column :sellers, :account_number, :string
    add_column :sellers, :ifsc_code, :string
    add_column :sellers, :account_holder_name, :string
  end
end
