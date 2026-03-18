angular.module("marketplaceApp").factory("CartService", function ($http, $rootScope, AuthService) {
  let cartItems = [];
  let cartQuantities = {};
  let lastUpdateTimestamp = 0;

  const updateCartData = (data, timestamp = 0) => {
    if (timestamp > 0 && timestamp < lastUpdateTimestamp) return;
    if (timestamp > 0) lastUpdateTimestamp = timestamp;

    const rawItems = data.cart_items || (Array.isArray(data) ? data : []);
    
    // Deduplicate by product_id and standardize IDs
    const seen = new Set();
    cartItems = [];
    rawItems.forEach(item => {
      const pid = parseInt(item.product_id);
      if (pid && !seen.has(pid)) {
        seen.add(pid);
        item.product_id = pid; // Standardize
        cartItems.push(item);
      }
    });
    
    cartQuantities = {};
    cartItems.forEach(item => {
      cartQuantities[item.product_id] = item.quantity;
    });

    const unifiedData = { cart_items: [...cartItems] };
    $rootScope.$broadcast("cartUpdated", { 
      count: cartItems.length, 
      items: cartItems,
      fullData: unifiedData 
    });
  };

  const getCartItemByProductId = (productId) => {
    const id = parseInt(productId);
    return cartItems.find(item => parseInt(item.product_id) === id);
  };

  return {
    fetchCart: function (timestamp = 0) {
      if (!AuthService.isLoggedIn()) {
        updateCartData([], timestamp);
        return;
      }
      $http.get(`${window.API_BASE}/cart`).then(res => {
        updateCartData(res.data, timestamp);
      });
    },
    getQuantity: function (productId) {
      return cartQuantities[productId] || 0;
    },
    addItem: function (product, quantity = 1) {
      if (!AuthService.isLoggedIn()) return;
      
      const now = Date.now();
      lastUpdateTimestamp = now;

      // Optimistic Update
      const existing = getCartItemByProductId(product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        // Use a stable structure similar to server response
        cartItems.push({ 
          id: 'temp-' + now, 
          product_id: product.id, 
          quantity: quantity, 
          product: product 
        });
      }
      updateCartData(cartItems, now);

      return $http.post(`${window.API_BASE}/cart/add_item`, { product_id: product.id, quantity: quantity })
        .then(res => {
          updateCartData(res.data, now);
          return res.data;
        }).catch(err => {
          this.fetchCart(); // Rollback on error
          throw err;
        });
    },
    updateQuantity: function (productId, quantity) {
      if (!AuthService.isLoggedIn()) return;
      const item = getCartItemByProductId(productId);
      
      if (!item) {
        if (quantity > 0) return this.addItem({ id: productId }, quantity);
        return;
      }
      
      if (quantity <= 0) return this.removeItem(productId);

      const now = Date.now();
      lastUpdateTimestamp = now;

      // Optimistic Update
      const oldQty = item.quantity;
      item.quantity = quantity;
      updateCartData(cartItems, now);

      return $http.patch(`${window.API_BASE}/cart/update_item/${item.id}`, { quantity: quantity })
        .then(res => {
          updateCartData(res.data, now);
          return res.data;
        }).catch(err => {
          item.quantity = oldQty; // Rollback
          updateCartData(cartItems, now);
          throw err;
        });
    },
    removeItem: function (productId) {
      if (!AuthService.isLoggedIn()) return;
      const item = getCartItemByProductId(productId);
      if (!item) return;

      const now = Date.now();
      lastUpdateTimestamp = now;

      // Optimistic Update
      const index = cartItems.indexOf(item);
      if (index > -1) {
        cartItems.splice(index, 1);
        updateCartData(cartItems, now);
      }

      return $http.delete(`${window.API_BASE}/cart/remove_item/${item.id}`)
        .then(res => {
          updateCartData(res.data, now);
          return res.data;
        }).catch(err => {
          this.fetchCart(); // Rollback
          throw err;
        });
    }
  };
});
