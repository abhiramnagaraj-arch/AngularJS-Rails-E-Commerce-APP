# Testing attachment access fix

require_relative 'config/environment'

def test_fix
  puts "Testing send(:attachment, :image) to break recursion..."
  p = Product.new(name: "Test", price: 10, stock_quantity: 1, seller: Seller.first, category: Category.first)
  
  # Try to define the state of the model as it would be with the fix
  class << p
    def image_url
      att = send(:attachment, :image)
      if att.attached?
        # mock URL generation
        "http://localhost:3000/test_url"
      else
        nil
      end
    end

    def image
      image_url
    end
  end
  
  begin
    puts "Calling image: #{p.image || 'nil'}"
    puts "PASSED: No recursion"
  rescue SystemStackError
    puts "FAILED: SystemStackError"
  rescue => e
    puts "Error: #{e.message}"
    puts e.backtrace.first(10)
  end
end

test_fix
