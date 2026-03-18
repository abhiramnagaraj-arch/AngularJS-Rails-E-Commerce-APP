angular.module("marketplaceApp").controller("ProductsController", function ($scope, $http, $rootScope, AuthService, $routeParams, $location, CartService) {
  $scope.products = null;
  $scope.categories = [];
  $scope.selectedCategory = "";
  $scope.searchQuery = $routeParams.query || "";

  const fetchProducts = function () {
    let url = `${window.API_BASE}/products?`;
    if ($scope.searchQuery) {
      url += `query=${encodeURIComponent($scope.searchQuery)}&`;
    }
    if ($scope.selectedCategory) {
      url += `category_id=${$scope.selectedCategory}`;
    }
    $http.get(url).then(res => $scope.products = res.data);
  };

  $http.get(`${window.API_BASE}/categories`).then(res => {
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
    CartService.addItem(product, 1);
  };

  $scope.getCartQuantity = function (productId) {
    return CartService.getQuantity(productId);
  };

  $scope.increaseQuantity = function (product) {
    const current = CartService.getQuantity(product.id);
    CartService.updateQuantity(product.id, current + 1);
  };

  $scope.decreaseQuantity = function (product) {
    const current = CartService.getQuantity(product.id);
    CartService.updateQuantity(product.id, current - 1);
  };
});

angular.module("marketplaceApp").controller("ProductDetailsController", function ($scope, $http, $routeParams, AuthService, $location, $rootScope, CartService) {
  $scope.product = {};
  $scope.newReview = { rating: 5 };

  const user = AuthService.getUser();
  $scope.isAdmin = user && user.role === 'admin';

  $http.get(`${window.API_BASE}/products/${$routeParams.id}`).then(res => $scope.product = res.data);

  $scope.submitReview = function () {
    $http.post(`${window.API_BASE}/products/${$scope.product.id}/reviews`, { review: $scope.newReview })
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
      $http.delete(`${window.API_BASE}/admin/reviews/${reviewId}`).then(() => {
        $scope.product.reviews = $scope.product.reviews.filter(r => r.id !== reviewId);
        alert("Review deleted.");
      }).catch(err => alert("Error deleting review."));
    }
  };

  $scope.addToCart = function (product, quantity) {
    CartService.addItem(product, quantity || 1);
  };

  $scope.getCartQuantity = function (productId) {
    return CartService.getQuantity(productId);
  };

  $scope.increaseQuantity = function (product) {
    const current = CartService.getQuantity(product.id);
    CartService.updateQuantity(product.id, current + 1);
  };

  $scope.decreaseQuantity = function (product) {
    const current = CartService.getQuantity(product.id);
    CartService.updateQuantity(product.id, current - 1);
  };
});
