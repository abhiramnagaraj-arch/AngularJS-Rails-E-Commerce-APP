const app = angular.module("marketplaceApp", ["ngRoute", "ngAnimate"]);

// =========================
// HTTP CONFIG + INTERCEPTOR ✅
// =========================
app.config(function ($httpProvider) {
  $httpProvider.defaults.withCredentials = true;
  $httpProvider.defaults.headers.common['Accept'] = 'application/json';
  $httpProvider.defaults.headers.common['Content-Type'] = 'application/json';

  // 🔥 ADD THIS LINE (IMPORTANT)
  $httpProvider.interceptors.push("AuthInterceptor");
});


// =========================
// ROUTING CONFIG
// =========================
app.config(function ($routeProvider) {
  const v = "?v=" + new Date().getTime();

  // Route guard: requires login
  const requireLogin = {
    auth: function (AuthService, $location, $q, $rootScope) {
      const deferred = $q.defer();
      if (AuthService.isLoggedIn()) {
        deferred.resolve();
      } else {
        $rootScope.message = { type: 'error', text: 'Authentication required. Please log in.' };
        AuthService.setIntendedRoute($location.path());
        $location.path('/login');
        deferred.reject();
      }
      return deferred.promise;
    }
  };

  // Route guard: requires admin role
  const requireAdmin = {
    auth: function (AuthService, $location, $q, $rootScope) {
      const deferred = $q.defer();
      const user = AuthService.getUser();
      if (AuthService.isLoggedIn() && user && user.role === 'admin') {
        deferred.resolve();
      } else {
        $rootScope.message = { type: 'error', text: 'Access denied. Admin privileges required.' };
        if (!AuthService.isLoggedIn()) {
          AuthService.setIntendedRoute($location.path());
          $location.path('/login');
        } else {
          $location.path('/');
        }
        deferred.reject();
      }
      return deferred.promise;
    }
  };

  // Route guard: requires seller or admin role
  const requireSeller = {
    auth: function (AuthService, $location, $q, $rootScope) {
      const deferred = $q.defer();
      const user = AuthService.getUser();
      if (AuthService.isLoggedIn() && user && (user.role === 'seller' || user.role === 'admin')) {
        deferred.resolve();
      } else {
        $rootScope.message = { type: 'error', text: 'Access denied. Seller privileges required.' };
        if (!AuthService.isLoggedIn()) {
          AuthService.setIntendedRoute($location.path());
          $location.path('/login');
        } else {
          $location.path('/');
        }
        deferred.reject();
      }
      return deferred.promise;
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