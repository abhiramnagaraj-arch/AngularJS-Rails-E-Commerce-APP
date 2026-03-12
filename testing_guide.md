# Testing Guide: Multi-Vendor Marketplace

Follow these steps to verify the full functionality of the platform.

## 1. Environment Setup

### Backend (Rails API)
1. Open a terminal in the `marketplace_api` directory.
2. Ensure dependencies are installed: `bundle install`
3. Run migrations: `rails db:migrate`
4. Start the server: `rails s` (Runs on `http://localhost:3000` by default).

### Frontend (AngularJS)
1. Open a terminal in the `marketplace_frontend` directory.
2. Start a simple static server (e.g., using `npx`):
   ```bash
   npx http-server -p 8080 --cors
   ```
3. Open `http://localhost:8080` in your browser.

---

## 2. Test Scenarios

### A. Buyer Flow (The Core Experience)
1. **Signup**: Go to `/#!/signup` and create a new account.
2. **Login**: Go to `/#!/login` with your new credentials.
3. **Browse**: Navigate to `/#!/products`. You should see the product list.
4. **Cart**: 
   - Click "Add to Cart" on a product.
   - Click the "Cart" button in the navbar.
   - Update quantities or remove items.
5. **Checkout**: Click "Proceed to Checkout". (Since this is a demo, it will create the order and redirect you back).

### B. Seller Flow (Store Management)
1. **Become a Seller**:
   - You can simulate this by sending a `POST` to `/api/v1/sellers` or I can add a "Become a Seller" button if requested.
   - Currently, you can create a seller record for your user in the Rails console:
     ```ruby
     user = User.find_by(email: 'your_email@example.com')
     user.update(role: :seller)
     Seller.create!(user: user, store_name: "My Awesome Store", store_description: "Top quality goods", verification_status: "pending")
     ```
2. **Dashboard**: Log in and visit `/#!/seller/dashboard`.
3. **Analytics**: Check "Total Sales", "Active Orders", etc.
4. **Product Management**: 
   - Verify you can see only *your* products.
   - Test "Delete" (and "Edit" if the UI is fully wired).

### C. Admin Flow (Platform Oversight)
1. **Promote to Admin**: In the Rails console:
   ```ruby
   User.find_by(email: 'your_admin@example.com').update(role: :admin)
   ```
2. **Admin Panel**: Visit `/#!/admin/dashboard`.
3. **Vendor Approval**:
   - Find "Pending Seller Approvals".
   - Click "Approve" for a seller.
4. **Global Stats**: Verify total revenue and commission tracking.

---

## 3. Stripe & Webhooks (Advanced)
To test the "Paid" status of an order without a real credit card:
1. Check the `stripe_payment_intent_id` in the `orders` table.
2. Use the Stripe CLI to trigger a success event:
   ```bash
   stripe trigger payment_intent.succeeded --params "payment_intent.id=PI_xxxx"
   ```
3. Verify the order status changes to `paid` and stock is deducted in the database.

---

## 4. Useful Rails Console Commands
- `User.all`: See all registered users.
- `Order.last`: Check the latest order details.
- `OrderItem.all`: Verify commission calculations.
