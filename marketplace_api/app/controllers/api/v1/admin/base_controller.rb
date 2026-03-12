class Api::V1::Admin::BaseController < ApplicationController
  include Devise::Controllers::Helpers
  before_action :authenticate_api_v1_user!
  check_authorization # Ensure every action is authorized

  # Base Admin controller for common logic
end
