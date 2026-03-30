angular.module("marketplaceApp").controller("CartController", function ($scope, $http, $location, $rootScope, AuthService, CartService) {
  $scope.cart = { cart_items: [] };
  $scope.addresses = [];
  $scope.selectedAddressId = null;
  $scope.newAddress = {};
  $scope.isAddingAddress = false;

  const fetchAddresses = function () {
    $http.get(`${window.API_BASE}/addresses`).then(res => {
      $scope.addresses = res.data;
      const defaultAddr = $scope.addresses.find(a => a.is_default);
      if (defaultAddr) {
        $scope.selectedAddressId = defaultAddr.id;
      } else if ($scope.addresses.length > 0) {
        $scope.selectedAddressId = $scope.addresses[0].id;
      }
    });
  };

  const fetchCart = function () {
    CartService.fetchCart();
  };
  
  $scope.viewState = {
    isAddingAddress: false
  };

  fetchCart();
  fetchAddresses();

  $scope.saveAddress = function () {
    const isEdit = !!$scope.newAddress.id;
    const url = isEdit ? `${window.API_BASE}/addresses/${$scope.newAddress.id}` : `${window.API_BASE}/addresses`;
    const method = isEdit ? 'put' : 'post';

    $http[method](url, { address: $scope.newAddress }).then(res => {
      fetchAddresses();
      $scope.selectedAddressId = res.data.id;
      $scope.cancelEditAddress();
    }).catch(err => {
      console.error("Save address error:", err);
      alert("Failed to save address: " + (err.data && err.data.errors ? err.data.errors.join(", ") : "Unknown error"));
    });
  };

  $scope.deleteAddress = function (id) {
    if (confirm("Are you sure you want to delete this address? This action cannot be undone.")) {
      $http.delete(`${window.API_BASE}/addresses/${id}`).then(() => {
        fetchAddresses();
        if ($scope.selectedAddressId === id) $scope.selectedAddressId = null;
      }).catch(err => alert("Failed to delete address"));
    }
  };

  $scope.startEditAddress = function (address) {
    console.log("[CART] Starting edit for address:", address);
    $scope.newAddress = angular.copy(address);
    $scope.viewState.isAddingAddress = true;
    
    // Scroll to form
    setTimeout(() => {
      const formEl = document.querySelector('.address-form-anchor');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  $scope.cancelEditAddress = function () {
    console.log("[CART] Cancelling edit/add");
    $scope.newAddress = {};
    $scope.viewState.isAddingAddress = false;
  };

  $scope.toggleAddAddress = function() {
    console.log("[CART] Toggling add address form");
    if ($scope.viewState.isAddingAddress) {
      $scope.cancelEditAddress();
    } else {
      $scope.newAddress = {};
      $scope.viewState.isAddingAddress = true;
    }
  };

  $scope.calculateTotal = function () {
    return $scope.cart.cart_items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  $scope.updateQuantity = function (item) {
    if (item.quantity < 1) return;
    $http.patch(`${window.API_BASE}/cart/update_item/${item.id}`, { quantity: item.quantity })
      .then(fetchCart);
  };

  $scope.increaseQuantity = function (item) {
    if (item.quantity >= item.product.stock_quantity) {
      // Quietly limit
      return;
    }
    CartService.updateQuantity(item.product_id, item.quantity + 1);
  };

  $scope.decreaseQuantity = function (item) {
    if (item.quantity <= 1) return;
    CartService.updateQuantity(item.product_id, item.quantity - 1);
  };

  $scope.removeItem = function (item) {
    CartService.removeItem(item.product_id);
  };

  $scope.$on("cartUpdated", function(event, data) {
    if (data && data.items) {
      $scope.cart.cart_items = data.items;
      // Recalculate local totals if needed or just use the calculatedTotal function
    }
  });

  $scope.paymentMethod = 'Online';
  $scope.isProcessing = false;

  $scope.initiateRazorpayPayment = function () {
    if (!$scope.selectedAddressId) {
      alert("Please select or add a delivery address.");
      return;
    }

    if ($scope.paymentMethod === 'COD') {
      $scope.checkout();
      return;
    }

    if (typeof Razorpay === 'undefined') {
      alert("Razorpay is not loaded. Please check your internet connection and refresh.");
      return;
    }

    const user = AuthService.getUser();
    $scope.isProcessing = true;

    // 1. Create Razorpay Order on backend
    $http.post(`${window.API_BASE}/orders/create_razorpay_order`, {
      address_id: $scope.selectedAddressId,
      payment_method: 'Online'
    }).then(res => {
      const orderData = res.data;

      // 2. Configure Razorpay Options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Marketplace",
        description: "Order Payment",
        order_id: orderData.id,
        handler: function (response) {
          // 3. Verify Payment on backend (wrapped in $apply for Angular digest)
          $scope.$apply(function () {
            $http.post(`${window.API_BASE}/orders/verify_razorpay_payment`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              address_id: $scope.selectedAddressId,
              payment_method: 'Online'
            }).then(verifyRes => {
              $scope.isProcessing = false;
              alert("Order placed successfully!");
              $location.path('/orders');
            }).catch(err => {
              $scope.isProcessing = false;
              const errorMsg = err.data && err.data.error ? err.data.error : "Payment verification failed. Please contact support.";
              alert("Error: " + errorMsg);
            });
          });
        },
        prefill: {
          email: user ? user.email : "",
          contact: "" // Could add phone if available
        },
        theme: {
          color: "#008ecc"
        },
        modal: {
          ondismiss: function () {
            $scope.$apply(() => {
              $scope.isProcessing = false;
            });
          }
        }
      };

      try {
        const rzp1 = new Razorpay(options);
        rzp1.open();
      } catch (e) {
        $scope.isProcessing = false;
        alert("Could not open Razorpay Checkout: " + e.message);
      }

    }).catch(err => {
      $scope.isProcessing = false;
      const errorMsg = err.data && err.data.error ? err.data.error : "Failed to initiate payment. Please try again.";
      alert("Checkout failed: " + errorMsg);
    });
  };

  $scope.checkout = function () {
    // Keep this for COD for now or refactor later
    if (!$scope.selectedAddressId) {
      alert("Please select or add a delivery address.");
      return;
    }
    const payload = {
      address_id: $scope.selectedAddressId,
      payment_method: $scope.paymentMethod
    };

    $http.post(`${window.API_BASE}/orders/checkout`, payload)
      .then(res => {
        alert("Order placed successfully!");
        $location.path("/orders");
      })
      .catch(err => {
        console.error("Checkout failed:", err);
        const errorMsg = err.data && err.data.error ? err.data.error : "Unknown error (Server might be down or returned HTML)";
        alert("Checkout failed: " + errorMsg);
      });
  };
});
