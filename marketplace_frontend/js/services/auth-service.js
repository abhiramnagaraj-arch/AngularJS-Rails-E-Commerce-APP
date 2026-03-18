// AuthService
angular.module("marketplaceApp").factory("AuthService", function ($window, $rootScope) {
  return {
    saveToken: function (token) { $window.localStorage.setItem("auth_token", token); },
    getToken: function () { return $window.localStorage.getItem("auth_token"); },
    saveUser: function (user) { $window.localStorage.setItem("user", JSON.stringify(user)); },
    getUser: function () {
      const user = $window.localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    },
    isLoggedIn: function () { return !!this.getToken(); },
    logout: function () {
      $window.localStorage.removeItem("auth_token");
      $window.localStorage.removeItem("user");
    }
  };
});

// Auth Interceptor for JWT
angular.module("marketplaceApp").factory("AuthInterceptor", function (AuthService, $location, $q) {
  return {
    request: function (config) {
      const token = AuthService.getToken();
      
      // Ensure we always request JSON
      config.headers['Accept'] = 'application/json';
      
      if (token) {
        config.headers['Authorization'] = token;
        console.log(`[AUTH] Interceptor: Sending token to ${config.method} ${config.url}`);
      } else {
        console.warn(`[AUTH] Interceptor: No token found for ${config.method} ${config.url}`);
      }
      return config;
    },
    responseError: function (rejection) {
      console.error(`[AUTH] Response Error ${rejection.status} for ${rejection.config ? rejection.config.url : 'unknown url'}`, rejection);
      if (rejection.status === 401) {
        console.error("[AUTH] 401 Detected - User likely unauthenticated or session expired.");
        AuthService.logout();
        $location.path("/login");
      }
      return $q.reject(rejection);
    }
  };
});

angular.module("marketplaceApp").config(function ($httpProvider) {
  $httpProvider.interceptors.push("AuthInterceptor");
});
