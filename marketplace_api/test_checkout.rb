require_relative 'config/environment'
user = User.find_by(email: 'buyer1@test.com') || User.create!(email: 'buyer1@test.com', password: 'password', role: :buyer)
cart = user.cart || Cart.create!(user: user)
seller = User.find_by(email: 'seller1@test.com') || User.create!(email: 'seller1@test.com', password: 'password', role: :seller)
seller_profile = seller.seller || Seller.create!(user: seller, store_name: 'Test Store', store_description: 'Desc', verification_status: 'approved')
category = Category.first || Category.create!(name: 'Test Category')
product = Product.create!(name: 'Test Product', price: 100, stock_quantity: 5, active: true, category: category, seller: seller_profile)
cart.cart_items.create!(product: product, quantity: 2)

puts "Before checkout: Product Stock: #{product.reload.stock_quantity}, Cart Items: #{cart.cart_items.count}"

app = ActionDispatch::Integration::Session.new(Rails.application)
app.host = 'localhost'
app.post '/api/v1/auth/login', params: { user: { email: user.email, password: 'password' } }, as: :json
token = app.response.parsed_body['token']
app.post '/api/v1/orders/checkout', headers: { 'Authorization' => token }, as: :json

puts "Response status: #{app.response.status}"
puts "Response body: #{app.response.body}"
puts "After checkout: Product Stock: #{product.reload.stock_quantity}, Cart Items: #{cart.cart_items.count}"
