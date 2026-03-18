const app = angular.module("marketplaceApp", ["ngRoute", "ngAnimate"]);

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
