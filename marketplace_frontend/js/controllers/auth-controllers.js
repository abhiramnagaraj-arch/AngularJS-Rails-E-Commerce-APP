angular.module("marketplaceApp").controller("LoginController", function ($scope, $http, $location, $rootScope, AuthService) {
  $scope.credentials = { role: 'buyer' };

  $scope.setRole = function (role) {
    $scope.credentials.role = role;
  };

  $scope.login = function () {
    $http.post(`${window.API_BASE}/auth/login`, { user: $scope.credentials })
      .then(res => {
        const token = res.headers("authorization") || res.data.token;
        if (token) {
          AuthService.saveToken(token);
        }
        if (res.data && res.data.user) {
          AuthService.saveUser(res.data.user);
        }
        
        $rootScope.message = { type: 'success', text: 'Logged in successfully!' };
        $rootScope.$broadcast("authChanged");

        // 1. Check for intended route first
        const intendedRoute = AuthService.getIntendedRoute();
        if (intendedRoute) {
          $location.path(intendedRoute);
          return;
        }

        // 2. Default role-based redirect
        const user = res.data.user;
        if (user.role === 'admin') {
          $location.path("/admin/dashboard");
        } else if (user.role === 'seller') {
          $location.path("/seller/dashboard");
        } else {
          $location.path("/");
        }
      })
      .catch(err => {
        console.error("Login failure:", err);
        $rootScope.message = { type: 'error', text: 'Login failed. Please check your credentials.' };
      });
  };
});

angular.module("marketplaceApp").controller("SignupController", function ($scope, $http, $location, $rootScope, AuthService) {
  $scope.user = { role: 'buyer' };
  
  $scope.signup = function () {
    $http.post(`${window.API_BASE}/auth/register`, { user: $scope.user })
      .then(res => {
        const token = res.headers("authorization") || res.data.token;
        if (token) {
          AuthService.saveToken(token);
        }
        if (res.data && res.data.user) {
          AuthService.saveUser(res.data.user);
        }
        
        $rootScope.message = { type: 'success', text: 'Signup successful!' };
        $rootScope.$broadcast("authChanged");

        if ($scope.user.become_seller) {
          $location.path("/seller/dashboard");
        } else {
          $location.path("/");
        }
      })
      .catch(err => {
        console.log("Signup error:", err);
        const errors = err.data && err.data.errors ? err.data.errors.join(", ") : "Signup failed";
        $rootScope.message = { type: 'error', text: 'Signup failed: ' + errors };
      });
  };
});
