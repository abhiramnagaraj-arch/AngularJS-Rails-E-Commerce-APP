angular.module("marketplaceApp").controller("SellerController", function ($scope, $http, $rootScope, AuthService) {
  $scope.stats = null;
  $scope.myProducts = [];
  $scope.myOrders = [];
  $scope.showingForm = false;
  $scope.editingProduct = {};

  const fetchDashboard = () => {
    $http.get(`${window.API_BASE}/sellers/stats`)
      .then(res => {
        $scope.stats = res.data;
        $scope.hasProfile = true;
      })
      .catch(err => {
        console.log("Stats fetch error:", err);
        $scope.stats = { error: true };
        $scope.hasProfile = false;
      });

    $http.get(`${window.API_BASE}/seller/products`).then(res => $scope.myProducts = res.data);

    // Fetch categories for the dropdown
    $http.get(`${window.API_BASE}/categories`).then(res => {
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
    $http.get(`${window.API_BASE}/auth/login`).catch(err => {
      // Dummy way to get current user refresh if needed
    });

    // Fetch Seller's scoped OrderItems
    $scope.sellerOrderFilterConfig = { customerId: "" };
    $scope.mySellerProfileId = null;

    $http.get(`${window.API_BASE}/seller/orders`).then(res => {
      $scope.myOrders = res.data;
      if ($scope.myOrders.length > 0 && $scope.myOrders[0].order_items && $scope.myOrders[0].order_items.length > 0) {
        $scope.mySellerProfileId = $scope.myOrders[0].order_items[0].product.seller_id;
      }
    });
  };
  fetchDashboard();

  $scope.requestReactivation = function () {
    if (confirm("Request protocol restoration? This signal will be transmitted to the Overseer (Admin).")) {
      $http.patch(`${window.API_BASE}/sellers/request_reactivation`)
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
      $http.patch(`${window.API_BASE}/seller/orders/${orderItem.id}/update_status`, { status: status })
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
    const url = $scope.editingProduct.id ? `${window.API_BASE}/seller/products/${$scope.editingProduct.id}` : `${window.API_BASE}/seller/products`;
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
    $http.post(`${window.API_BASE}/sellers`, { seller: $scope.newSeller })
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
      $http.delete(`${window.API_BASE}/seller/products/${product.id}`)
        .then(() => fetchDashboard());
    }
  };

  $scope.requestReactivation = function () {
    if (confirm("Are you sure you want to request reactivation?")) {
      // Immediate UI feedback
      if ($scope.stats) $scope.stats.reactivation_requested = true;

      $http.patch(`${window.API_BASE}/sellers/request_reactivation`)
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
