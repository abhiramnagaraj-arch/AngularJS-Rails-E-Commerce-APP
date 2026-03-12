# Clear existing records
puts "Cleaning database..."
OrderItem.delete_all
Product.delete_all
Seller.delete_all
Review.delete_all
CartItem.delete_all
Cart.delete_all
User.delete_all
Category.delete_all

# Seed Categories
puts "Seeding categories..."
categories = [
  { name: 'Groceries', subcategories: ['Fruits & Vegetables', 'Dairy & Bakery', 'Staples'] },
  { name: 'Electronics', subcategories: ['Mobiles', 'Laptops', 'Accessories'] },
  { name: 'Fashion', subcategories: ['Men', 'Women', 'Kids'] },
  { name: 'Home & Kitchen', subcategories: ['Kitchenware', 'Home Decor', 'Furnishing'] }
]

categories.each do |cat_data|
  parent = Category.find_or_create_by!(name: cat_data[:name])
  cat_data[:subcategories].each do |sub_name|
    Category.find_or_create_by!(name: sub_name, parent_id: parent.id)
  end
end

# Create Predefined Admin
puts "Creating admin user..."
User.create!(
  email: 'admin@marketplace.com',
  password: 'Admin@123',
  password_confirmation: 'Admin@123',
  role: :admin
)

puts "Seeding completed successfully!"
puts "Admin Credentials:"
puts "Email: admin@marketplace.com"
puts "Password: Admin@123"
