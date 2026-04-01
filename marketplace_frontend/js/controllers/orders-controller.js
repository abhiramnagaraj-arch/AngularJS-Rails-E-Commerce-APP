angular.module("marketplaceApp").controller("OrdersController", function ($scope, $http) {
  $scope.orders = [];

  const fetchOrders = function () {
    $http.get(`${window.API_BASE}/orders`).then(res => {
      // Data is now automatically unwrapped by AuthInterceptor
      $scope.orders = res.data || [];
    }).catch(err => console.error("Could not fetch orders", err));
  };
  fetchOrders();
});
