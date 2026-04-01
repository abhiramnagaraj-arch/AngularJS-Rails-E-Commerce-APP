angular.module("marketplaceApp").controller("MainController", function ($scope, $location, AuthService, $http, CartService, $rootScope, $timeout) {
  $scope.isLoggedIn = AuthService.isLoggedIn();
  $scope.currentUser = AuthService.getUser();
  $scope.cartCount = 0;
  $scope.categories = [];
  $scope.searchData = { query: "" };

  // Notification handling
  $rootScope.$watch('message', function (newMsg) {
    if (newMsg) {
      $timeout(function () {
        $rootScope.message = null;
      }, 5000);
    }
  });

  $scope.onSearch = function (event) {
    if (event.keyCode === 13) { // Enter key pressed
      if ($scope.searchData.query) {
        $location.path("/products").search({ query: $scope.searchData.query });
      } else {
        $location.path("/products").search({});
      }
    }
  };

  // Sync search bar with URL params
  $scope.$on('$routeChangeSuccess', function() {
    $scope.searchData.query = $location.search().query || "";
  });

  const fetchCategories = () => {
    $http.get(`${window.API_BASE}/categories`).then(res => {
      // Data is now automatically unwrapped by AuthInterceptor
      $scope.categories = res.data || [];
    });
  };
  fetchCategories();

  $scope.isRole = function (role) {
    const user = AuthService.getUser();
    return user && user.role === role;
  };

  $scope.logout = function () {
    AuthService.logout();
  };

  $scope.$on("authChanged", function () {
    $scope.isLoggedIn = AuthService.isLoggedIn();
    $scope.currentUser = AuthService.getUser();
    if ($scope.isLoggedIn) {
      CartService.fetchCart();
    } else {
      $scope.cartCount = 0;
    }
    // Force UI refresh
    if (!$scope.$$phase) $scope.$apply();
  });

  $scope.$on("cartUpdated", function (event, data) {
    $scope.cartCount = typeof data === 'object' ? data.count : data;
  });

  // Initial fetch
  if ($scope.isLoggedIn) {
    CartService.fetchCart();
  }
});
