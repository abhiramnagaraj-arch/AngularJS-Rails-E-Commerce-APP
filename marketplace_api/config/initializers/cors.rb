Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'http://localhost:4200', 'http://127.0.0.1:4200'

    resource '*',
      headers: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With'],
      expose: ['Authorization'],
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true
  end
end