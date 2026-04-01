# Clear existing records
puts "Cleaning database..."
# Order items and products first due to foreign keys
OrderItem.delete_all
CartItem.delete_all
Review.delete_all
Product.delete_all
# Then categories, invoices, addresses, etc.
Category.delete_all
Invoice.delete_all
Order.delete_all
Address.delete_all
Seller.delete_all
Cart.delete_all
User.delete_all

# Seed Users
puts "Seeding users..."
# Buyer
User.create!(
  email: 'abhi@test.com',
  password: '12345',
  password_confirmation: '12345',
  role: :buyer
)

# Seller
seller_user = User.create!(
  email: 'seller2@test.com',
  password: '123456',
  password_confirmation: '123456',
  role: :seller
)

# Admin
admin_user = User.create!(
  email: 'admin@marketplace.com',
  password: 'Admin@123',
  password_confirmation: 'Admin@123',
  role: :admin
)

# Create Seller Profiles
puts "Creating seller profiles..."
seller_profile = Seller.create!(
  user: seller_user,
  store_name: "Abhi's General Store",
  store_description: "Selling a variety of high-quality goods.",
  verification_status: :approved
)

admin_seller_profile = Seller.create!(
  user: admin_user,
  store_name: "Marketplace Premium Store",
  store_description: "Direct items from the marketplace admin.",
  verification_status: :approved
)

# Seed Categories and Products
puts "Seeding categories and products..."
realistic_data = [
  {
    category: 'Groceries',
    items: [
      { subcategory: 'Fruits & Vegetables', product: 'Organic Bananas', price: 2.50, stock: 100 },
      { subcategory: 'Dairy & Bakery', product: 'Fresh Whole Milk', price: 3.99, stock: 50 },
      { subcategory: 'Staples', product: 'Basmati Rice (5kg)', price: 15.00, stock: 80 }
    ],
    parent_product: { name: 'Assorted Grocery Bag', price: 25.00, stock: 20 }
  },
  {
    category: 'Electronics',
    items: [
      { subcategory: 'Mobiles', product: 'iPhone 15 Pro', price: 999.99, stock: 10 },
      { subcategory: 'Laptops', product: 'MacBook Air M2', price: 1199.00, stock: 5 },
      { subcategory: 'Accessories', product: 'Wireless Mouse', price: 29.99, stock: 100 }
    ],
    parent_product: { name: 'LED Desk Lamp', price: 45.00, stock: 30 }
  },
  {
    category: 'Fashion',
    items: [
      { subcategory: 'Men', product: 'Classic White T-Shirt', price: 19.99, stock: 200 },
      { subcategory: 'Women', product: 'Floral Summer Dress', price: 49.99, stock: 50 },
      { subcategory: 'Kids', product: 'Cotton Pajama Set', price: 15.00, stock: 100 }
    ],
    parent_product: { name: 'Canvas Tote Bag', price: 10.00, stock: 150 }
  },
  {
    category: 'Home & Kitchen',
    items: [
      { subcategory: 'Kitchenware', product: 'Cast Iron Skillet', price: 35.00, stock: 40 },
      { subcategory: 'Home Decor', product: 'Scented Candle Set', price: 20.00, stock: 60 },
      { subcategory: 'Furnishing', product: 'Soft Throw Blanket', price: 25.00, stock: 75 }
    ],
    parent_product: { name: 'Wall Clock', price: 30.00, stock: 20 }
  }
]

sellers = [seller_profile, admin_seller_profile]
seller_index = 0

realistic_data.each do |cat_group|
  # Create parent category
  parent_cat = Category.create!(name: cat_group[:category])

  # Create product in parent category
  Product.create!(
    name: cat_group[:parent_product][:name],
    description: "High quality #{cat_group[:parent_product][:name]} from our #{cat_group[:category]} collection.",
    price: cat_group[:parent_product][:price],
    stock_quantity: cat_group[:parent_product][:stock],
    category_id: parent_cat.id,
    seller_id: sellers[seller_index % 2].id,
    active: true
  )
  seller_index += 1

  # Create subcategories and their products
  cat_group[:items].each do |item_data|
    sub_cat = Category.create!(name: item_data[:subcategory], parent_id: parent_cat.id)

    Product.create!(
      name: item_data[:product],
      description: "Premium #{item_data[:product]} available in our #{item_data[:subcategory]} section.",
      price: item_data[:price],
      stock_quantity: item_data[:stock],
      category_id: sub_cat.id,
      seller_id: sellers[seller_index % 2].id,
      active: true
    )
    seller_index += 1
  end
end

puts "Seeding completed successfully!"
puts "-------------------------------"
puts "Buyer Credentials: abhi@test.com / 12345"
puts "Seller Credentials: seller2@test.com / 123456"
puts "Admin Credentials: admin@marketplace.com / Admin@123"
puts "-------------------------------"
puts "Total Users: #{User.count}"
puts "Total Sellers: #{Seller.count}"
puts "Total Categories: #{Category.count}"
puts "Total Products: #{Product.count}"
puts "-------------------------------"
