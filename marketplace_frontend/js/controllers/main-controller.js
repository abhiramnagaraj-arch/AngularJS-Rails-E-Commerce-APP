angular.module("marketplaceApp").controller("MainController", function ($scope, $location, AuthService, $http, CartService) {
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
    $http.get(`${window.API_BASE}/categories`).then(res => $scope.categories = res.data);
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
    if ($scope.isLoggedIn) {
      CartService.fetchCart();
    } else {
      $scope.cartCount = 0;
    }
  });

  $scope.$on("cartUpdated", function (event, data) {
    $scope.cartCount = typeof data === 'object' ? data.count : data;
  });

  // Initial fetch
  if ($scope.isLoggedIn) {
    CartService.fetchCart();
  }
});
