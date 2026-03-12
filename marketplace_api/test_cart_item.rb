user = User.first
cart = user.cart || user.create_cart!
product = Product.last
requested_quantity = 1

cart_item = cart.cart_items.find_or_initialize_by(product: product)
new_total_quantity = (cart_item.quantity || 0) + requested_quantity

if new_total_quantity > product.stock_quantity
  puts "Out of stock"
else
  cart_item.quantity = new_total_quantity
  if cart_item.save
    puts "Saved!"
  else
    puts "Errors: #{cart_item.errors.full_messages}"
  end
end
