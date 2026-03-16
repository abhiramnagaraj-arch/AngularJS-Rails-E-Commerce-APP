const app = angular.module("marketplaceApp", ["ngRoute", "ngAnimate"]);

const API_BASE = "http://127.0.0.1:3000/api/v1";

app.config(function ($httpProvider) {
  $httpProvider.defaults.withCredentials = true;
  $httpProvider.defaults.headers.common['Accept'] = 'application/json';
  $httpProvider.defaults.headers.common['Content-Type'] = 'application/json';
});

// Routing Configuration
app.config(function ($routeProvider) {
  const v = "?v=" + new Date().getTime();

  // Route guard: requires login
  const requireLogin = {
    auth: function (AuthService, $location) {
      if (!AuthService.isLoggedIn()) {
        $location.path('/login');
        return false;
      }
      return true;
    }
  };

  // Route guard: requires admin role
  const requireAdmin = {
    auth: function (AuthService, $location) {
      const user = AuthService.getUser();
      if (!user || user.role !== 'admin') {
        alert("Access denied. Admin privileges required.");
        $location.path('/');
        return false;
      }
      return true;
    }
  };

  // Route guard: requires seller or admin role
  const requireSeller = {
    auth: function (AuthService, $location) {
      const user = AuthService.getUser();
      if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
        alert("Access denied. Seller privileges required.");
        $location.path('/');
        return false;
      }
      return true;
    }
  };

  $routeProvider
    .when("/", { templateUrl: "views/home.html" + v })
    .when("/login", { templateUrl: "views/login.html" + v, controller: "LoginController" })
    .when("/signup", { templateUrl: "views/signup.html" + v, controller: "SignupController" })
    .when("/products", { templateUrl: "views/products.html" + v, controller: "ProductsController" })
    .when("/products/:id", { templateUrl: "views/product_details.html" + v, controller: "ProductDetailsController" })
    .when("/cart", { templateUrl: "views/cart.html" + v, controller: "CartController", resolve: requireLogin })
    .when("/orders", { templateUrl: "views/orders.html" + v, controller: "OrdersController", resolve: requireLogin })
    .when("/seller/dashboard", { templateUrl: "views/seller/dashboard.html" + v, controller: "SellerController", resolve: requireSeller })
    .when("/admin/dashboard", { templateUrl: "views/admin/dashboard.html" + v, controller: "AdminController", resolve: requireAdmin })
    .otherwise({ redirectTo: "/" });
});

// Main Controller
app.controller("MainController", function ($scope, $location, AuthService, $http) {
  $scope.isLoggedIn = AuthService.isLoggedIn();
  $scope.currentUser = AuthService.getUser();
  $scope.cartCount = 0;
  $scope.categories = [];
  $scope.searchQuery = "";

  $scope.onSearch = function (event) {
    if (event.keyCode === 13) { // Enter key pressed
      if ($scope.searchQuery) {
        $location.path("/products").search({ query: $scope.searchQuery });
      } else {
        $location.path("/products").search({});
      }
    }
  };

  const fetchCategories = () => {
    $http.get(`${API_BASE}/categories`).then(res => $scope.categories = res.data);
  };
  fetchCategories();

  $scope.isRole = function (role) {
    return $scope.currentUser && $scope.currentUser.role === role;
  };

  $scope.logout = function () {
    AuthService.logout();
    $scope.isLoggedIn = false;
    $scope.currentUser = null;
    $location.path("/");
  };

  $scope.$on("authChanged", function () {
    $scope.isLoggedIn = AuthService.isLoggedIn();
    $scope.currentUser = AuthService.getUser();
  });

  $scope.$on("cartUpdated", function (event, count) {
    $scope.cartCount = count;
  });
});

// AuthService
app.factory("AuthService", function ($window, $rootScope) {
  return {
    saveToken: function (token) { $window.localStorage.setItem("auth_token", token); },
    getToken: function () { return $window.localStorage.getItem("auth_token"); },
    saveUser: function (user) { $window.localStorage.setItem("user", JSON.stringify(user)); },
    getUser: function () {
      const user = $window.localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    },
    isLoggedIn: function () { return !!this.getToken(); },
    logout: function () {
      $window.localStorage.removeItem("auth_token");
      $window.localStorage.removeItem("user");
    }
  };
});

// Auth Interceptor for JWT
app.factory("AuthInterceptor", function (AuthService, $location, $q) {
  return {
    request: function (config) {
      const token = AuthService.getToken();
      
      // Ensure we always request JSON
      config.headers['Accept'] = 'application/json';
      
      if (token) {
        config.headers['Authorization'] = token;
        console.log(`[AUTH] Interceptor: Sending token to ${config.method} ${config.url}`);
      } else {
        console.warn(`[AUTH] Interceptor: No token found for ${config.method} ${config.url}`);
      }
      return config;
    },
    responseError: function (rejection) {
      console.error(`[AUTH] Response Error ${rejection.status} for ${rejection.config ? rejection.config.url : 'unknown url'}`, rejection);
      if (rejection.status === 401) {
        console.error("[AUTH] 401 Detected - User likely unauthenticated or session expired.");
        AuthService.logout();
        $location.path("/login");
      }
      return $q.reject(rejection);
    }
  };
});
app.config(function ($httpProvider) {
  $httpProvider.interceptors.push("AuthInterceptor");
});

app.directive('fileModel', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var model = $parse(attrs.fileModel);
      var modelSetter = model.assign;

      element.bind('change', function () {
        scope.$apply(function () {
          var file = element[0].files[0];
          if (file) {
            // 5MB Limit
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
              alert("File too large. Maximum size is 5MB.");
              element.val(""); // Clear the input
              return;
            }
            modelSetter(scope, file);
          }
        });
      });
    }
  };
}]);

// Controllers (Placeholders or partial implementations)
app.controller("LoginController", function ($scope, $http, $location, $rootScope, AuthService) {
  $scope.credentials = { role: 'buyer' };

  $scope.setRole = function (role) {
    $scope.credentials.role = role;
  };

  $scope.login = function () {
    $http.post(`${API_BASE}/auth/login`, { user: $scope.credentials })
      .then(res => {
        console.log("[AUTH] Login SUCCESS. Status:", res.status);
        console.log("[AUTH] Login Headers:", res.headers());
        console.log("[AUTH] Login Data:", JSON.stringify(res.data));
        const token = res.headers("authorization") || res.headers("Authorization") || res.data.token;
        if (token) {
          const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          AuthService.saveToken(formattedToken);
          console.log("[AUTH] Token saved:", formattedToken);
        } else {
          console.error("[AUTH] Login success but NO TOKEN found in headers or data!");
        }
        if (res.data && res.data.user) {
          AuthService.saveUser(res.data.user);
        } else {
          console.error("[AUTH] Login success but NO USER data found!");
        }
        $rootScope.$broadcast("authChanged");

        // Role based redirect using intended role or actual role
        const user = res.data.user;
        const intendedRole = $scope.credentials.role;

        if (user.role === 'admin' || intendedRole === 'admin') {
          $location.path("/admin/dashboard");
        } else if (user.role === 'seller' || intendedRole === 'seller') {
          $location.path("/seller/dashboard");
        } else {
          $location.path("/");
        }
      })
      .catch(err => {
        console.error("Login failure:", err);
        alert("Login failed. Please check your credentials.");
      });
  };
});

app.controller("SignupController", function ($scope, $http, $location, $rootScope, AuthService) {
  $scope.user = {};
  $scope.user = { role: 'buyer' };
  $scope.signup = function () {
    $http.post(`${API_BASE}/auth/register`, { user: $scope.user })
      .then(res => {
        console.log("[AUTH] Signup SUCCESS. Status:", res.status);
        console.log("[AUTH] Signup Headers:", res.headers());
        console.log("[AUTH] Signup Data:", JSON.stringify(res.data));
        const token = res.headers("authorization") || res.headers("Authorization") || res.data.token;
        if (token) {
          const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          AuthService.saveToken(formattedToken);
          console.log("[AUTH] Token saved:", formattedToken);
        } else {
          console.error("[AUTH] Signup success but NO TOKEN found!");
        }
        if (res.data && res.data.user) {
          AuthService.saveUser(res.data.user);
        } else {
          console.error("[AUTH] Signup success but NO USER data found!");
        }
        $rootScope.$broadcast("authChanged");

        if ($scope.user.become_seller) {
          alert("Signup successful! Now please set up your seller profile.");
          $location.path("/seller/dashboard"); // They will need to create profile there
        } else {
          alert("Signup successful!");
          $location.path("/");
        }
      })
      .catch(err => {
        console.log("Signup error:", err);
        const errors = err.data && err.data.errors ? err.data.errors.join(", ") : "Signup failed";
        alert("Signup failed: " + errors);
      });
  };
});

app.controller("ProductsController", function ($scope, $http, $rootScope, AuthService, $routeParams, $location) {
  $scope.products = null;
  $scope.categories = [];
  $scope.selectedCategory = "";
  $scope.searchQuery = $routeParams.query || "";

  const fetchProducts = function () {
    let url = `${API_BASE}/products?`;
    if ($scope.searchQuery) {
      url += `query=${encodeURIComponent($scope.searchQuery)}&`;
    }
    if ($scope.selectedCategory) {
      url += `category_id=${$scope.selectedCategory}`;
    }
    $http.get(url).then(res => $scope.products = res.data);
  };

  $http.get(`${API_BASE}/categories`).then(res => {
    $scope.categories = res.data;
    if ($routeParams.category) {
      const catName = $routeParams.category.toLowerCase();
      const found = $scope.categories.find(c => c.name.toLowerCase().includes(catName));
      if (found) {
        $scope.selectedCategory = found.id;
      }
    }
  }).finally(() => {
    fetchProducts();
  });

  $scope.filterProducts = function () {
    const cat = $scope.categories.find(c => c.id === $scope.selectedCategory);
    $location.search('query', null); // Clear text search
    if (cat) {
      $location.search('category', cat.name);
    } else {
      $location.search('category', null);
    }
    fetchProducts();
  };

  $scope.addToCart = function (product) {
    if (!AuthService.isLoggedIn()) {
      alert("Please login to add items to cart.");
      return;
    }
    $http.post(`${API_BASE}/cart/add_item`, { product_id: product.id, quantity: 1 })
      .then((res) => {
        alert("Item added to your cart!");
        $rootScope.$broadcast("cartUpdated", res.data.cart_items ? res.data.cart_items.length : 1);
      })
      .catch((err) => {
        console.error("Cart error:", err);
        let msg = "Could not add to cart.";
        if (err.status === 401 || err.status === 403) msg = "Please login to add items to cart.";
        if (err.data) {
          if (err.data.error) msg = err.data.error;
          else if (err.data.errors) msg = Array.isArray(err.data.errors) ? err.data.errors.join(", ") : err.data.errors;
        }
        alert(msg);
      });
  };
});

app.controller("ProductDetailsController", function ($scope, $http, $routeParams, AuthService, $location, $rootScope) {
  $scope.product = {};
  $scope.newReview = { rating: 5 };

  const user = AuthService.getUser();
  $scope.isAdmin = user && user.role === 'admin';

  $http.get(`${API_BASE}/products/${$routeParams.id}`).then(res => $scope.product = res.data);

  $scope.submitReview = function () {
    $http.post(`${API_BASE}/products/${$scope.product.id}/reviews`, { review: $scope.newReview })
      .then(res => {
        if (!$scope.product.reviews) $scope.product.reviews = [];
        $scope.product.reviews.push(res.data);
        $scope.newReview = { rating: 5, comment: "" };
        alert("Review submitted!");
      })
      .catch(err => {
        console.error("Review error:", err);
        let msg = "Unauthorized or purchase required.";
        if (err.data && err.data.error) msg = err.data.error;
        if (err.data && err.data.errors) msg = err.data.errors.join(", ");
        alert(msg);
      });
  };

  $scope.deleteReview = function (reviewId) {
    if (confirm("Delete this review permanently?")) {
      $http.delete(`${API_BASE}/admin/reviews/${reviewId}`).then(() => {
        $scope.product.reviews = $scope.product.reviews.filter(r => r.id !== reviewId);
        alert("Review deleted.");
      }).catch(err => alert("Error deleting review."));
    }
  };

  $scope.addToCart = function (product, quantity) {
    if (!AuthService.isLoggedIn()) {
      $location.path("/login");
      return;
    }
    const qty = quantity || 1;
    $http.post(`${API_BASE}/cart/add_item`, { product_id: product.id, quantity: qty })
      .then(res => {
        const count = (res.data && res.data.cart_items) ? res.data.cart_items.length : 1;
        $rootScope.$broadcast("cartUpdated", count);
        alert("Product added to cart!");
      })
      .catch(err => {
        console.error("Add to cart error:", err);
        let msg = "Could not add to cart";
        if (err.data) {
          if (err.data.error) msg = err.data.error;
          else if (err.data.errors) msg = Array.isArray(err.data.errors) ? err.data.errors.join(", ") : err.data.errors;
        }
        alert(msg);
      });
  };
});

app.controller("CartController", function ($scope, $http, $location, $rootScope, AuthService) {
  $scope.cart = { cart_items: [] };
  $scope.addresses = [];
  $scope.selectedAddressId = null;
  $scope.newAddress = {};
  $scope.isAddingAddress = false;

  const fetchAddresses = function () {
    $http.get(`${API_BASE}/addresses`).then(res => {
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
    $http.get(`${API_BASE}/cart`).then(res => {
      $scope.cart = res.data;
      $rootScope.$broadcast("cartUpdated", res.data.cart_items.length);
    });
  };
  fetchCart();
  fetchAddresses();

  $scope.saveAddress = function () {
    if ($scope.newAddress.id) {
      $http.put(`${API_BASE}/addresses/${$scope.newAddress.id}`, { address: $scope.newAddress }).then(res => {
        fetchAddresses();
        $scope.selectedAddressId = res.data.id;
        $scope.newAddress = {};
        $scope.isAddingAddress = false;
      }).catch(err => alert("Failed to update address"));
    } else {
      $http.post(`${API_BASE}/addresses`, { address: $scope.newAddress }).then(res => {
        fetchAddresses();
        $scope.selectedAddressId = res.data.id;
        $scope.newAddress = {};
        $scope.isAddingAddress = false;
      }).catch(err => alert("Failed to save address"));
    }
  };

  $scope.deleteAddress = function (id) {
    if (confirm("Are you sure you want to delete this address?")) {
      $http.delete(`${API_BASE}/addresses/${id}`).then(() => {
        fetchAddresses();
        if ($scope.selectedAddressId === id) $scope.selectedAddressId = null;
      }).catch(err => alert("Failed to delete address"));
    }
  };

  $scope.startEditAddress = function (address) {
    $scope.newAddress = angular.copy(address);
    $scope.isAddingAddress = true;
  };

  $scope.calculateTotal = function () {
    return $scope.cart.cart_items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  $scope.updateQuantity = function (item) {
    if (item.quantity < 1) return;
    $http.patch(`${API_BASE}/cart/update_item/${item.id}`, { quantity: item.quantity })
      .then(fetchCart);
  };

  $scope.increaseQuantity = function (item) {
    if (item.quantity >= item.product.stock_quantity) {
      alert("Cannot exceed available stock");
      return;
    }
    item.quantity++;
    $scope.updateQuantity(item);
  };

  $scope.decreaseQuantity = function (item) {
    if (item.quantity <= 1) return;
    item.quantity--;
    $scope.updateQuantity(item);
  };

  $scope.removeItem = function (item) {
    $http.delete(`${API_BASE}/cart/remove_item/${item.id}`)
      .then(fetchCart);
  };

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
    $http.post(`${API_BASE}/orders/create_razorpay_order`, {
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
            $http.post(`${API_BASE}/orders/verify_razorpay_payment`, {
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

    $http.post(`${API_BASE}/orders/checkout`, payload)
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

app.controller("OrdersController", function ($scope, $http) {
  $scope.orders = [];

  const fetchOrders = function () {
    $http.get(`${API_BASE}/orders`).then(res => {
      $scope.orders = res.data;
    }).catch(err => console.error("Could not fetch orders", err));
  };
  fetchOrders();
});

app.controller("SellerController", function ($scope, $http) {
  $scope.stats = null;
  $scope.myProducts = [];
  $scope.myOrders = [];
  $scope.showingForm = false;
  $scope.editingProduct = {};

  const fetchDashboard = () => {
    $http.get(`${API_BASE}/sellers/stats`)
      .then(res => {
        $scope.stats = res.data;
        $scope.hasProfile = true;
      })
      .catch(err => {
        console.log("Stats fetch error:", err);
        $scope.stats = { error: true };
        $scope.hasProfile = false;
      });

    $http.get(`${API_BASE}/seller/products`).then(res => $scope.myProducts = res.data);

    // Fetch categories for the dropdown
    $http.get(`${API_BASE}/categories`).then(res => {
      console.log("Fetched categories for seller:", res.data);
      let flatCategories = [];
      res.data.forEach(cat => {
        flatCategories.push({ id: cat.id, name: cat.name, isParent: true });
        if (cat.subcategories && cat.subcategories.length > 0) {
          cat.subcategories.forEach(sub => {
            flatCategories.push({ id: sub.id, name: `${cat.name} > ${sub.name}`, isParent: false });
          });
        }
      });
      $scope.flatCategories = flatCategories;
      console.log("Flat categories:", flatCategories);
    });

    // Check seller status
    $http.get(`${API_BASE}/auth/login`).catch(err => {
      // Dummy way to get current user refresh if needed
    });

    // Fetch Seller's scoped OrderItems
    $scope.sellerOrderFilterConfig = { customerId: "" };
    $scope.mySellerProfileId = null;

    $http.get(`${API_BASE}/seller/orders`).then(res => {
      $scope.myOrders = res.data;
      if ($scope.myOrders.length > 0 && $scope.myOrders[0].order_items && $scope.myOrders[0].order_items.length > 0) {
        $scope.mySellerProfileId = $scope.myOrders[0].order_items[0].product.seller_id;
      }
    });
  };
  fetchDashboard();

  $scope.requestReactivation = function () {
    if (confirm("Request protocol restoration? This signal will be transmitted to the Overseer (Admin).")) {
      $http.patch(`${API_BASE}/sellers/request_reactivation`)
        .then(res => {
          alert("Reactivation request transmitted. Protocol status: PENDING OVERRIDE.");
          fetchDashboard();
        })
        .catch(err => {
          alert("Signal failure: " + (err.data ? err.data.error : "Unknown interference"));
        });
    }
  };

  $scope.getUniqueSellerBuyers = function () {
    if (!$scope.myOrders || !Array.isArray($scope.myOrders)) return [];
    const buyersMap = {};
    $scope.myOrders.forEach(order => {
      if (order.buyer && !buyersMap[order.buyer.id]) {
        buyersMap[order.buyer.id] = order.buyer;
      }
    });
    return Object.values(buyersMap);
  };

  $scope.getFilteredSellerOrders = function () {
    if (!$scope.myOrders || !Array.isArray($scope.myOrders)) return [];
    return $scope.myOrders.filter(order => {
      const matchCustomer = !$scope.sellerOrderFilterConfig.customerId || order.buyer_id == $scope.sellerOrderFilterConfig.customerId;
      return matchCustomer;
    });
  };

  $scope.updateOrderStatus = function (orderItem, status) {
    if (confirm(`Change status to ${status}?`)) {
      $http.patch(`${API_BASE}/seller/orders/${orderItem.id}/update_status`, { status: status })
        .then(() => fetchDashboard())
        .catch(err => alert("Error updating status"));
    }
  };

  $scope.openAddProduct = () => {
    if (!$scope.flatCategories || $scope.flatCategories.length === 0) {
      fetchDashboard();
    }
    $scope.editingProduct = { active: true };
    $scope.showingForm = true;

    // Smooth scroll to the form
    setTimeout(() => {
      const formElement = document.getElementById("addProductForm");
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  $scope.editProduct = (p) => {
    $scope.editingProduct = angular.copy(p);
    $scope.showingForm = true;
  };

  $scope.saveProduct = () => {
    const url = $scope.editingProduct.id ? `${API_BASE}/seller/products/${$scope.editingProduct.id}` : `${API_BASE}/seller/products`;
    const method = $scope.editingProduct.id ? 'put' : 'post';

    let fd = new FormData();
    for (let key in $scope.editingProduct) {
      if ($scope.editingProduct[key] !== undefined && $scope.editingProduct[key] !== null) {
        if (key === 'image_url') continue;
        if (key === 'image' && typeof $scope.editingProduct[key] !== 'object') continue;
        fd.append(`product[${key}]`, $scope.editingProduct[key]);
      }
    }

    $http[method](url, fd, {
      transformRequest: angular.identity,
      headers: { 'Content-Type': undefined }
    })
      .then(() => {
        alert("Product saved successfully!");
        $scope.showingForm = false;
        fetchDashboard();
      })
      .catch(err => {
        console.error("Save product error:", err);
        let errorMsg = "You must be an APPROVED seller to post products.";
        if (err.data && err.data.errors) {
          errorMsg = Array.isArray(err.data.errors) ? err.data.errors.join(", ") : err.data.errors;
        } else if (err.data && err.data.error) {
          errorMsg = err.data.error;
        }
        alert("Error saving product: " + errorMsg);
      });
  };

  $scope.newSeller = {};
  $scope.createSellerProfile = () => {
    $http.post(`${API_BASE}/sellers`, { seller: $scope.newSeller })
      .then(res => {
        alert("Seller profile submitted for approval!");
        // Update user's role to seller in local storage, unless they are an admin
        let user = AuthService.getUser();
        if (user && user.role !== 'admin') {
          user.role = 'seller';
          AuthService.saveUser(user);
        }
        $rootScope.$broadcast("authChanged");
        fetchDashboard();
      })
      .catch(err => {
        console.error("Error creating profile:", err);
        let errorMsg = "Failed to create profile";
        if (err.data) {
          if (err.data.error) errorMsg = err.data.error;
          else if (err.data.errors) errorMsg = Array.isArray(err.data.errors) ? err.data.errors.join(", ") : err.data.errors;
        }
        alert("Error: " + errorMsg);
      });
  };

  $scope.deleteProduct = function (product) {
    if (confirm("Are you sure?")) {
      $http.delete(`${API_BASE}/seller/products/${product.id}`)
        .then(() => fetchDashboard());
    }
  };

  $scope.requestReactivation = function () {
    if (confirm("Are you sure you want to request reactivation?")) {
      // Immediate UI feedback
      if ($scope.stats) $scope.stats.reactivation_requested = true;

      $http.patch(`${API_BASE}/sellers/request_reactivation`)
        .then(res => {
          alert("Reactivation request sent. Please wait for an admin to review it.");
          fetchDashboard();
        })
        .catch(err => {
          alert("Failed to send request.");
          // Rollback on error
          if ($scope.stats) $scope.stats.reactivation_requested = false;
        });
    }
  };
});

app.controller("AdminController", function ($scope, $http) {
  $scope.allProducts = [];
  $scope.stats = {};
  $scope.allSellers = [];
  $scope.flatCategories = [];
  $scope.allOrders = [];
  $scope.showingForm = false;
  $scope.editingProduct = {};
  $scope.allReviews = [];
  $scope.groupedOrders = {};
  $scope.sellerSearch = { store_name: '', onlyReactivation: false };

  $scope.orderFilterConfig = {
    viewType: 'global',
    customerId: '',
    sellerId: '',
    timeRange: 'all'
  };

  $scope.groupOrdersByStatus = function () {
    if (!$scope.allOrders) return;
    const filtered = $scope.getFilteredOrders();

    $scope.groupedOrders = [
      { id: 'pending', label: 'PENDING TRANSMISSIONS', items: filtered.filter(o => o.status === 'pending') },
      { id: 'paid', label: 'READY FOR DISPATCH', items: filtered.filter(o => o.status === 'paid') },
      { id: 'shipped', label: 'ACTIVE SHIPMENTS', items: filtered.filter(o => o.status === 'shipped') },
      { id: 'delivered', label: 'COMPLETED DELIVERIES', items: filtered.filter(o => o.status === 'delivered') },
      { id: 'cancelled', label: 'CANCELLED/FAILED', items: filtered.filter(o => o.status === 'cancelled' || o.status === 'failed') },
      { id: 'unclassified', label: 'MISCELLANEOUS SIGNAL', items: filtered.filter(o => !['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'failed'].includes(o.status)) }
    ];
  };

  $scope.getFilteredOrders = function () {
    if (!$scope.allOrders) return [];
    let orders = [...$scope.allOrders];

    // 1. Time-based filtering
    if ($scope.orderFilterConfig.timeRange !== 'all') {
      const now = new Date();
      let threshold;
      if ($scope.orderFilterConfig.timeRange === '24h') threshold = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      else if ($scope.orderFilterConfig.timeRange === '7d') threshold = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      else if ($scope.orderFilterConfig.timeRange === '30d') threshold = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      if (threshold) {
        orders = orders.filter(o => new Date(o.created_at) >= threshold);
      }
    }

    // 2. View type and ID filtering
    if ($scope.orderFilterConfig.viewType === 'customer' && $scope.orderFilterConfig.customerId) {
      orders = orders.filter(o => String(o.buyer_id) === String($scope.orderFilterConfig.customerId));
    }

    if ($scope.orderFilterConfig.viewType === 'seller' && $scope.orderFilterConfig.sellerId) {
      orders = orders.map(o => {
        const filteredItems = o.order_items.filter(item => item.product && String(item.product.seller_id) === String($scope.orderFilterConfig.sellerId));
        return filteredItems.length > 0 ? { ...o, order_items: filteredItems } : null;
      }).filter(o => o !== null);
    }

    // 3. Absolute sorting by Newest First
    return orders.sort((a, b) => (b.id || 0) - (a.id || 0));
  };

  $scope.scrollToSection = function (id) {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const yOffset = -100; 
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      } else {
        console.warn(`[ADMIN] Scroll target not found: ${id}`);
      }
    }, 150);
  };

  $scope.scrollToSellers = () => $scope.scrollToSection('active-merchants');

  $scope.moderateAllSignals = function () {
    console.log("[ADMIN] Moderating all signals (Filtering & Scrolling)...");
    $scope.sellerSearch.onlyReactivation = true;
    $scope.sellerSearch.store_name = '';
    $scope.scrollToSellers();
  };

  $scope.focusMerchant = function (storeName) {
    console.log(`[ADMIN] Focusing merchant: ${storeName}`);
    $scope.sellerSearch.store_name = storeName;
    $scope.sellerSearch.onlyReactivation = false;
    $scope.scrollToSellers();
  };

  $scope.resetScanners = function () {
    console.log("[ADMIN] Resetting scanners...");
    $scope.sellerSearch.store_name = '';
    $scope.sellerSearch.onlyReactivation = false;
    $scope.scrollToSellers();
  };

  // Reactive grouping
  $scope.$watchCollection('orderFilterConfig', () => $scope.groupOrdersByStatus());

  $scope.getUniqueBuyers = function () {
    if (!$scope.allOrders) return [];
    const buyersMap = {};
    $scope.allOrders.forEach(o => {
      if (o.buyer && !buyersMap[o.buyer_id]) {
        buyersMap[o.buyer_id] = { id: o.buyer_id, email: o.buyer.email };
      }
    });
    return Object.values(buyersMap);
  };

  const fetchAdminData = () => {
    $http.get(`${API_BASE}/admin/dashboard`).then(res => {
      if (res.data.stats) $scope.stats = res.data.stats;
      else $scope.stats = res.data;
    });
    $http.get(`${API_BASE}/admin/products`).then(res => $scope.allProducts = res.data);

    // Fetch sellers
    $http.get(`${API_BASE}/admin/sellers`).then(res => $scope.allSellers = res.data);

    // Fetch reviews
    $http.get(`${API_BASE}/admin/reviews`).then(res => {
      $scope.allReviews = res.data;
      // Group reviews by category name
      $scope.groupedReviews = {};
      res.data.forEach(review => {
        const catName = (review.product && review.product.category) ? review.product.category.name : 'General';
        if (!$scope.groupedReviews[catName]) {
          $scope.groupedReviews[catName] = [];
        }
        $scope.groupedReviews[catName].push(review);
      });
    });

    // Fetch Global Orders
    $http.get(`${API_BASE}/admin/orders`).then(res => {
      $scope.allOrders = res.data;
      $scope.groupOrdersByStatus();
    });

    // Orders already grouped via watch/init

    // Fetch categories for the dropdown
    $http.get(`${API_BASE}/categories`).then(res => {
      let flatCategories = [];
      res.data.forEach(cat => {
        flatCategories.push({ id: cat.id, name: cat.name, isParent: true });
        if (cat.subcategories && cat.subcategories.length > 0) {
          cat.subcategories.forEach(sub => {
            flatCategories.push({ id: sub.id, name: `${cat.name} > ${sub.name}`, isParent: false });
          });
        }
      });
      $scope.flatCategories = flatCategories;
    });
  };

  fetchAdminData();

  $scope.openAddProduct = () => {
    $scope.editingProduct = { active: true };
    $scope.showingForm = true;
    scrollToSection('adminProductForm');
  };

  $scope.deleteProduct = function (product) {
    if (confirm("Are you sure you want to delete this product?")) {
      $http.delete(`${API_BASE}/admin/products/${product.id}`)
        .then(() => {
          fetchAdminData();
          alert("Product deleted.");
        })
        .catch(err => alert("Error deleting product"));
    }
  };

  $scope.editProduct = (p) => {
    $scope.editingProduct = angular.copy(p);
    $scope.showingForm = true;
    setTimeout(() => {
      const formElement = document.getElementById("adminProductForm");
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  $scope.saveProduct = () => {
    const url = $scope.editingProduct.id ? `${API_BASE}/admin/products/${$scope.editingProduct.id}` : `${API_BASE}/admin/products`;
    const method = $scope.editingProduct.id ? 'put' : 'post';

    let fd = new FormData();
    for (let key in $scope.editingProduct) {
      if ($scope.editingProduct[key] !== undefined && $scope.editingProduct[key] !== null) {
        if (key === 'image_url') continue;
        if (key === 'image' && typeof $scope.editingProduct[key] !== 'object') continue;
        fd.append(`product[${key}]`, $scope.editingProduct[key]);
      }
    }

    $http[method](url, fd, {
      transformRequest: angular.identity,
      headers: { 'Content-Type': undefined }
    })
      .then(() => {
        alert("Global Product saved successfully!");
        $scope.showingForm = false;
        fetchAdminData();
      })
      .catch(err => alert("Error saving product: " + (err.data.errors ? err.data.errors.join(", ") : "Failed")));
  };



  // Restored seller approval actions
  $scope.approveSeller = function (seller) {
    if (confirm(`Approve store '${seller.store_name}'?`)) {
      $http.patch(`${API_BASE}/admin/sellers/${seller.id}/approve`)
        .then(() => {
          alert("Seller approved successfully!");
          fetchAdminData();
        })
        .catch(err => alert("Error approving seller."));
    }
  };

  $scope.rejectSeller = function (seller) {
    if (confirm(`Reject store '${seller.store_name}'?`)) {
      $http.patch(`${API_BASE}/admin/sellers/${seller.id}/reject`)
        .then(() => {
          alert("Seller rejected successfully.");
          fetchAdminData();
        })
        .catch(err => alert("Error rejecting seller."));
    }
  };

  $scope.suspendSeller = function (seller) {
    if (confirm(`Suspend store '${seller.store_name}'?`)) {
      $http.patch(`${API_BASE}/admin/sellers/${seller.id}/suspend`)
        .then(() => {
          alert("Seller suspended.");
          fetchAdminData();
        })
        .catch(err => alert("Error suspending seller."));
    }
  };

  $scope.reactivateSeller = function (seller) {
    if (confirm(`Reactivate store '${seller.store_name}'?`)) {
      $http.patch(`${API_BASE}/admin/sellers/${seller.id}/reactivate`)
        .then(() => {
          alert("Seller reactivated.");
          fetchAdminData();
        })
        .catch(err => alert("Error reactivating seller."));
    }
  };

  $scope.updateGlobalOrderStatus = function (order, status) {
    if (confirm(`Change global order status to ${status}?`)) {
      $http.put(`${API_BASE}/admin/orders/${order.id}`, { status: status })
        .then(() => fetchAdminData())
        .catch(err => alert("Error updating global order status"));
    }
  };

  $scope.updateGlobalPaymentStatus = function (order, status) {
    if (confirm(`Change payment status to ${status}?`)) {
      $http.put(`${API_BASE}/admin/orders/${order.id}`, { payment_status: status })
        .then(() => fetchAdminData())
        .catch(err => alert("Error updating payment status"));
    }
  };

  $scope.deleteReview = function (review) {
    if (confirm("Are you sure you want to delete this review?")) {
      $http.delete(`${API_BASE}/admin/reviews/${review.id}`)
        .then(() => {
          alert("Review deleted.");
          fetchAdminData();
        })
        .catch(err => alert("Error deleting review."));
    }
  };
});