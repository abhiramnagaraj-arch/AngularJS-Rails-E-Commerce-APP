# frozen_string_literal: true

Devise.setup do |config|

  require 'devise/orm/active_record'

  config.mailer_sender = 'no-reply@marketplace.com'

  config.case_insensitive_keys = [:email]
  config.strip_whitespace_keys = [:email]

  config.skip_session_storage = [:http_auth, :params_auth]

  config.navigational_formats = []

  config.stretches = Rails.env.test? ? 1 : 12

  config.password_length = 6..128
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/

  config.reconfirmable = false
  config.expire_all_remember_me_on_sign_out = true
  config.reset_password_within = 6.hours

  config.sign_out_via = :delete
  config.parent_controller = 'ApplicationController'
  config.jwt do |jwt|
    jwt.secret = Rails.application.secret_key_base || ENV['SECRET_KEY_BASE']

    jwt.dispatch_requests = [
      ['POST', %r{^/api/v1/auth/login(\.json)?$}],
      ['POST', %r{^/api/v1/auth/register(\.json)?$}]
    ]

    jwt.revocation_requests = [
      ['DELETE', %r{^/api/v1/auth/logout(\.json)?$}]
    ]

    jwt.expiration_time = 1.hour.to_i
  end

end 