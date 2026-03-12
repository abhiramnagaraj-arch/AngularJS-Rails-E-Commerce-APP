require 'net/http'
require 'json'
require 'uri'

uri = URI('http://localhost:3000/api/v1/auth/login')
http = Net::HTTP.new(uri.host, uri.port)
request = Net::HTTP::Post.new(uri.path, {'Content-Type' => 'application/json'})
request.body = {user: {email: "raj@gmail.com", password: "password"}}.to_json
response = http.request(request)

token = JSON.parse(response.body)["token"] || response['Authorization']

puts "Token: #{token}"

uri = URI('http://localhost:3000/api/v1/cart/add_item')
request = Net::HTTP::Post.new(uri.path, {'Content-Type' => 'application/json', 'Authorization' => token})
request.body = {product_id: 1, quantity: 1}.to_json
cart_res = http.request(request)

puts "Status: #{cart_res.code}"
puts "Body: #{cart_res.body}"
