require "test_helper"

class Api::V1::ProductsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @category = Category.create!(name: "Electronics")
    @seller = User.create!(email: "seller@example.com", password: "password", role: "seller")
    @seller_profile = Seller.create!(user: @seller, store_name: "Tech Store", store_description: "Top tech products", suspended: false, verification_status: "approved")
    @product1 = Product.create!(name: "Smartphone", description: "Latest model", price: 500, stock_quantity: 10, category: @category, seller: @seller_profile, active: true)
    @product2 = Product.create!(name: "Laptop", description: "Powerful workstation", price: 1200, stock_quantity: 5, category: @category, seller: @seller_profile, active: true)
  end

  test "should get index with search query" do
    get api_v1_products_url, params: { query: "smart" }, as: :json
    assert_response :success
    json_response = JSON.parse(response.body)
    assert_equal 1, json_response.length
    assert_equal "Smartphone", json_response.first["name"]
  end

  test "should search in description" do
    get api_v1_products_url, params: { query: "workstation" }, as: :json
    assert_response :success
    json_response = JSON.parse(response.body)
    assert_equal 1, json_response.length
    assert_equal "Laptop", json_response.first["name"]
  end

  test "should search in category name" do
    get api_v1_products_url, params: { query: "electronics" }, as: :json
    assert_response :success
    json_response = JSON.parse(response.body)
    assert_equal 2, json_response.length
  end
end
