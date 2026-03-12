require_relative 'config/environment'
Rails.application.config.hosts.clear
app = ActionDispatch::Integration::Session.new(Rails.application)
app.host = 'localhost'

# Create a new user and try to become a seller
user = User.create!(email: "newseller_#{Time.now.to_i}@test.com", password: 'password', role: :buyer)
app.post '/api/v1/auth/login', params: { user: { email: user.email, password: 'password' } }, as: :json
token = app.response.parsed_body['token']

app.post '/api/v1/sellers', params: { seller: { store_name: 'Auto Approved Store', store_description: 'Checking' } }, headers: { 'Authorization' => token }, as: :json
puts "Create Seller Response: #{app.response.status}"
seller_status = app.response.parsed_body.dig('seller', 'verification_status')
puts "New Seller Status: #{seller_status}"

# Verify order statuses feature
buyer = User.find_by(email: 'buyer1@test.com') || User.create!(email: 'buyer1@test.com', password: 'password', role: :buyer)
app.post '/api/v1/auth/login', params: { user: { email: buyer.email, password: 'password' } }, as: :json
buyer_token = app.response.parsed_body['token']

app.get '/api/v1/orders', headers: { 'Authorization' => buyer_token }, as: :json
puts "Orders list status: #{app.response.status}"
order = app.response.parsed_body.last
first_item = order['order_items'].first
puts "First item initial status: #{first_item['status']}"

# Update as seller
seller_user = User.find(first_item['seller_id'])
app.post '/api/v1/auth/login', params: { user: { email: seller_user.email, password: 'password' } }, as: :json
seller_token = app.response.parsed_body['token']

app.patch "/api/v1/seller/orders/#{first_item['id']}/update_status", params: { status: 'shipped' }, headers: { 'Authorization' => seller_token }, as: :json
puts "Update item status response: #{app.response.status}"

# Fetch again as buyer
app.get '/api/v1/orders', headers: { 'Authorization' => buyer_token }, as: :json
updated_item = app.response.parsed_body.last['order_items'].first
puts "First item updated status: #{updated_item['status']}"
