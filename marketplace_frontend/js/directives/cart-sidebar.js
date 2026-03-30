angular.module("marketplaceApp").directive("cartSidebar", function ($rootScope, CartService, $timeout, $location) {
  return {
    restrict: 'E',
    templateUrl: 'views/layout/cart-sidebar.html',
    link: function (scope) {
      scope.cart = { items: [], total: 0 };
      scope.isLoading = false;

      // Listen for cart updates
      scope.$on("cartUpdated", function (event, data) {
        console.log("CartSidebar: received update", data.timestamp);
        
        // Wrap update in $timeout to ensure UI sync and prevent glitches
        $timeout(function() {
            scope.cart.items = data.items;
            calculateTotal();

            // Automatically open on EVERY user-initiated change (timestamp > 0)
            if (data.timestamp > 0) {
              console.log("CartSidebar: Forcing open");
              scope.toggleSidebar(true);
            }
        });
      });

      const calculateTotal = () => {
        scope.cart.total = scope.cart.items.reduce((sum, item) => {
          return sum + (item.product.price * item.quantity);
        }, 0);
      };

      scope.toggleSidebar = function (state) {
        $timeout(function() {
            scope.isOpen = (state !== undefined) ? state : !scope.isOpen;
            $rootScope.isCartOpen = scope.isOpen; 
            console.log("CartSidebar: toggle to", scope.isOpen);
        });
      };

      scope.updateQuantity = function (productId, delta) {
        const item = scope.cart.items.find(i => i.product_id === productId);
        if (!item) return;

        const newQty = item.quantity + delta;
        scope.isLoading = true;
        CartService.updateQuantity(productId, newQty).finally(() => {
          scope.isLoading = false;
        });
      };

      scope.removeItem = function (productId) {
        scope.isLoading = true;
        CartService.removeItem(productId).finally(() => {
          scope.isLoading = false;
        });
      };

      scope.goToCheckout = function () {
        scope.toggleSidebar(false);
        $location.path('/cart');
      };

      // Initial fetch if logged in
      CartService.fetchCart();
    }
  };
});
