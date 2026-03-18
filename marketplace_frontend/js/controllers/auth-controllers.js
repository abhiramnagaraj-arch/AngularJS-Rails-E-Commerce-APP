angular.module("marketplaceApp").controller("LoginController", function ($scope, $http, $location, $rootScope, AuthService) {
  $scope.credentials = { role: 'buyer' };

  $scope.setRole = function (role) {
    $scope.credentials.role = role;
  };

  $scope.login = function () {
    $http.post(`${window.API_BASE}/auth/login`, { user: $scope.credentials })
      .then(res => {
        console.log("[AUTH] Login SUCCESS. Status:", res.status);
        console.log("[AUTH] Login Headers:", res.headers());
        console.log("[AUTH] Login Data:", JSON.stringify(res.data));
        const token = res.headers("authorization") || res.headers("Authorization") || res.data.token;
        if (token) {
          const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          AuthService.saveToken(formattedToken);
          console.log("[AUTH] Token saved:", formattedToken);
        } else {
          console.error("[AUTH] Login success but NO TOKEN found in headers or data!");
        }
        if (res.data && res.data.user) {
          AuthService.saveUser(res.data.user);
        } else {
          console.error("[AUTH] Login success but NO USER data found!");
        }
        $rootScope.$broadcast("authChanged");

        // Role based redirect using intended role or actual role
        const user = res.data.user;
        const intendedRole = $scope.credentials.role;

        if (user.role === 'admin' || intendedRole === 'admin') {
          $location.path("/admin/dashboard");
        } else if (user.role === 'seller' || intendedRole === 'seller') {
          $location.path("/seller/dashboard");
        } else {
          $location.path("/");
        }
      })
      .catch(err => {
        console.error("Login failure:", err);
        alert("Login failed. Please check your credentials.");
      });
  };
});

angular.module("marketplaceApp").controller("SignupController", function ($scope, $http, $location, $rootScope, AuthService) {
  $scope.user = {};
  $scope.user = { role: 'buyer' };
  $scope.signup = function () {
    $http.post(`${window.API_BASE}/auth/register`, { user: $scope.user })
      .then(res => {
        console.log("[AUTH] Signup SUCCESS. Status:", res.status);
        console.log("[AUTH] Signup Headers:", res.headers());
        console.log("[AUTH] Signup Data:", JSON.stringify(res.data));
        const token = res.headers("authorization") || res.headers("Authorization") || res.data.token;
        if (token) {
          const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          AuthService.saveToken(formattedToken);
          console.log("[AUTH] Token saved:", formattedToken);
        } else {
          console.error("[AUTH] Signup success but NO TOKEN found!");
        }
        if (res.data && res.data.user) {
          AuthService.saveUser(res.data.user);
        } else {
          console.error("[AUTH] Signup success but NO USER data found!");
        }
        $rootScope.$broadcast("authChanged");

        if ($scope.user.become_seller) {
          alert("Signup successful! Now please set up your seller profile.");
          $location.path("/seller/dashboard"); // They will need to create profile there
        } else {
          alert("Signup successful!");
          $location.path("/");
        }
      })
      .catch(err => {
        console.log("Signup error:", err);
        const errors = err.data && err.data.errors ? err.data.errors.join(", ") : "Signup failed";
        alert("Signup failed: " + errors);
      });
  };
});
