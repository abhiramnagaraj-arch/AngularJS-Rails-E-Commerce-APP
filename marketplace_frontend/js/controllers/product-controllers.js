angular.module("marketplaceApp").controller("ProductsController", function ($scope, $http, $rootScope, AuthService, $routeParams, $location, CartService) {
  $scope.filters = {
    search: $routeParams.query || "",
    category_id: "",
    min_price: null,
    max_price: null,
    sort: "newest"
  };

  $scope.paginationMeta = {};
  $scope.page = 1;

  const fetchProducts = function (page) {
    if (page) $scope.page = page;
    $scope.products = null; // Immediate loading state
    let url = `${window.API_BASE}/products?page=${$scope.page}`;
    
    // Append filters
    Object.keys($scope.filters).forEach(key => {
      const val = $scope.filters[key];
      if (val !== undefined && val !== null && val !== "") {
        url += `&${key}=${encodeURIComponent(val)}`;
      }
    });

    $http.get(url).then(res => {
      // Data is now automatically unwrapped by AuthInterceptor
      $scope.products = res.data || [];
      $scope.paginationMeta = res.originalMeta || {};
    });
  };

  $scope.nextPage = function () {
    if ($scope.page < $scope.paginationMeta.total_pages) {
      fetchProducts($scope.page + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  $scope.prevPage = function () {
    if ($scope.page > 1) {
      fetchProducts($scope.page - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  $http.get(`${window.API_BASE}/categories`).then(res => {
    // Data is now automatically unwrapped by AuthInterceptor
    $scope.categories = res.data || [];
    
    if ($routeParams.category) {
      const catName = $routeParams.category.toLowerCase();
      const found = $scope.categories.find(c => c.name.toLowerCase().includes(catName));
      if (found) {
        $scope.filters.category_id = found.id;
      }
    }
  }).finally(() => {
    fetchProducts();
  });

  $scope.fetchProducts = () => fetchProducts(1);

  $scope.resetFilters = function () {
    $scope.filters = {
      search: "",
      category_id: "",
      min_price: null,
      max_price: null,
      sort: "newest"
    };
    $scope.fetchProducts();
  };

  $scope.filterProducts = function () {
    $scope.fetchProducts();
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

  $http.get(`${window.API_BASE}/products/${$routeParams.id}`).then(res => {
    // Data is now automatically unwrapped by AuthInterceptor
    $scope.product = res.data || {};
  });

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
