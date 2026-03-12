class ChangeReactivationRequestedDefault < ActiveRecord::Migration[8.1]
  def change
    change_column_default :sellers, :reactivation_requested, from: nil, to: false
  end
end
