angular.module("marketplaceApp").factory("AuthInterceptor", function ($window, $q, $location, $injector) {
  return {
    request: function (config) {
      // Use $injector to avoid circular dependency
      const AuthService = $injector.get("AuthService");
      const token = AuthService.getToken();

      if (token) {
        // 1. Check if token is physically present but expired
        if (AuthService.isTokenExpired(token)) {
          console.warn("[AUTH] Token expired, logging out...");
          AuthService.logout();
          return $q.reject(config);
        }

        // 2. Attach Bearer token
        config.headers.Authorization = 'Bearer ' + token;
      }

      return config;
    },

    responseError: function (rejection) {
      if (rejection.status === 401) {
        const AuthService = $injector.get("AuthService");
        console.error("[AUTH] 401 Unauthorized detected globally");
        
        AuthService.setIntendedRoute($location.path());
        AuthService.logout();
      }
      return $q.reject(rejection);
    }
  };
});