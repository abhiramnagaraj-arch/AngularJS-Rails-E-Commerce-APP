angular.module("marketplaceApp").controller("AdminController", function ($scope, $http) {
  $scope.allProducts = [];
  $scope.stats = {};
  $scope.allSellers = [];
  $scope.flatCategories = [];
  $scope.allOrders = [];
  $scope.showingForm = false;
  $scope.editingProduct = {};
  $scope.allReviews = [];
  $scope.groupedOrders = [];
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
      { id: 'processing', label: 'PROCESSING TRANSMISSIONS', items: filtered.filter(o => o.status === 'processing') },
      { id: 'unclassified', label: 'MISCELLANEOUS SIGNAL', items: filtered.filter(o => !['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'failed', 'processing'].includes(o.status)) }
    ];
  };

  $scope.getFilteredOrders = function () {
    if (!$scope.allOrders || !Array.isArray($scope.allOrders)) return [];
    let orders = [...$scope.allOrders];

    // 1. Time-based filtering
    if ($scope.orderFilterConfig.timeRange !== 'all') {
      const now = new Date();
      let threshold;
      if ($scope.orderFilterConfig.timeRange === '24h') threshold = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      else if ($scope.orderFilterConfig.timeRange === '7d') threshold = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      else if ($scope.orderFilterConfig.timeRange === '30d') threshold = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      if (threshold) {
        orders = orders.filter(o => o.created_at && new Date(o.created_at) >= threshold);
      }
    }

    // 2. View type and ID filtering
    if ($scope.orderFilterConfig.viewType === 'customer' && $scope.orderFilterConfig.customerId) {
      orders = orders.filter(o => o && String(o.buyer_id) === String($scope.orderFilterConfig.customerId));
    }

    if ($scope.orderFilterConfig.viewType === 'seller' && $scope.orderFilterConfig.sellerId) {
      orders = orders.map(o => {
        if (!o) return null;
        const filteredItems = (o.order_items || []).filter(item => item && item.product && String(item.product.seller_id) === String($scope.orderFilterConfig.sellerId));
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
    if (!$scope.allOrders || !Array.isArray($scope.allOrders)) return [];
    const buyersMap = {};
    $scope.allOrders.forEach(o => {
      if (o && o.buyer && o.buyer_id && !buyersMap[o.buyer_id]) {
        buyersMap[o.buyer_id] = { id: o.buyer_id, email: o.buyer.email };
      }
    });
    return Object.values(buyersMap);
  };

  const fetchAdminData = () => {
    $http.get(`${window.API_BASE}/admin/dashboard`).then(res => {
      if (res.data.stats) $scope.stats = res.data.stats;
      else $scope.stats = res.data;
    }).catch(err => console.error("[ADMIN] Error fetching stats:", err));

    $http.get(`${window.API_BASE}/admin/products`).then(res => {
      $scope.allProducts = Array.isArray(res.data) ? res.data : [];
    }).catch(err => console.error("[ADMIN] Error fetching products:", err));

    // Fetch sellers
    $http.get(`${window.API_BASE}/admin/sellers`).then(res => {
      $scope.allSellers = Array.isArray(res.data) ? res.data : [];
    }).catch(err => console.error("[ADMIN] Error fetching sellers:", err));

    // Fetch reviews
    $http.get(`${window.API_BASE}/admin/reviews`).then(res => {
      const data = Array.isArray(res.data) ? res.data : (res.data.reviews || []);
      $scope.allReviews = data;
      // Group reviews by category name
      $scope.groupedReviews = {};
      data.forEach(review => {
        const catName = (review.product && review.product.category) ? review.product.category.name : 'General';
        if (!$scope.groupedReviews[catName]) {
          $scope.groupedReviews[catName] = [];
        }
        $scope.groupedReviews[catName].push(review);
      });
    }).catch(err => console.error("[ADMIN] Error fetching reviews:", err));

    // Fetch Global Orders
    $http.get(`${window.API_BASE}/admin/orders`).then(res => {
      $scope.allOrders = Array.isArray(res.data) ? res.data : (res.data.orders || []);
      $scope.groupOrdersByStatus();
    }).catch(err => {
      console.error("[ADMIN] Error fetching orders:", err);
      $scope.allOrders = [];
      $scope.groupOrdersByStatus();
    });

    // Fetch categories for the dropdown
    $http.get(`${window.API_BASE}/categories`).then(res => {
      let flatCategories = [];
      const data = Array.isArray(res.data) ? res.data : [];
      data.forEach(cat => {
        flatCategories.push({ id: cat.id, name: cat.name, isParent: true });
        if (cat.subcategories && cat.subcategories.length > 0) {
          cat.subcategories.forEach(sub => {
            flatCategories.push({ id: sub.id, name: `${cat.name} > ${sub.name}`, isParent: false });
          });
        }
      });
      $scope.flatCategories = flatCategories;
    }).catch(err => console.error("[ADMIN] Error fetching categories:", err));
  };

  fetchAdminData();

  $scope.openAddProduct = () => {
    $scope.editingProduct = { active: true };
    $scope.showingForm = true;
    scrollToSection('adminProductForm');
  };

  $scope.deleteProduct = function (product) {
    if (confirm("Are you sure you want to delete this product?")) {
      $http.delete(`${window.API_BASE}/admin/products/${product.id}`)
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
    const url = $scope.editingProduct.id ? `${window.API_BASE}/admin/products/${$scope.editingProduct.id}` : `${window.API_BASE}/admin/products`;
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
      $http.patch(`${window.API_BASE}/admin/sellers/${seller.id}/approve`)
        .then(() => {
          alert("Seller approved successfully!");
          fetchAdminData();
        })
        .catch(err => alert("Error approving seller."));
    }
  };

  $scope.rejectSeller = function (seller) {
    if (confirm(`Reject store '${seller.store_name}'?`)) {
      $http.patch(`${window.API_BASE}/admin/sellers/${seller.id}/reject`)
        .then(() => {
          alert("Seller rejected successfully.");
          fetchAdminData();
        })
        .catch(err => alert("Error rejecting seller."));
    }
  };

  $scope.suspendSeller = function (seller) {
    if (confirm(`Suspend store '${seller.store_name}'?`)) {
      $http.patch(`${window.API_BASE}/admin/sellers/${seller.id}/suspend`)
        .then(() => {
          alert("Seller suspended.");
          fetchAdminData();
        })
        .catch(err => alert("Error suspending seller."));
    }
  };

  $scope.reactivateSeller = function (seller) {
    if (confirm(`Reactivate store '${seller.store_name}'?`)) {
      $http.patch(`${window.API_BASE}/admin/sellers/${seller.id}/reactivate`)
        .then(() => {
          alert("Seller reactivated.");
          fetchAdminData();
        })
        .catch(err => alert("Error reactivating seller."));
    }
  };

  $scope.updateGlobalOrderStatus = function (order, status) {
    if (confirm(`Change global order status to ${status}?`)) {
      $http.put(`${window.API_BASE}/admin/orders/${order.id}`, { status: status })
        .then(() => fetchAdminData())
        .catch(err => alert("Error updating global order status"));
    }
  };

  $scope.updateGlobalPaymentStatus = function (order, status) {
    if (confirm(`Change payment status to ${status}?`)) {
      $http.put(`${window.API_BASE}/admin/orders/${order.id}`, { payment_status: status })
        .then(() => fetchAdminData())
        .catch(err => alert("Error updating payment status"));
    }
  };

  $scope.deleteReview = function (review) {
    if (confirm("Are you sure you want to delete this review?")) {
      $http.delete(`${window.API_BASE}/admin/reviews/${review.id}`)
        .then(() => {
          alert("Review deleted.");
          fetchAdminData();
        })
        .catch(err => alert("Error deleting review."));
    }
  };
});
