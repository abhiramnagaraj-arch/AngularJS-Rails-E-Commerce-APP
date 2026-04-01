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

    response: function (response) {
      // ✅ UNIVERSAL DATA UNWRAPPING
      // Standardized API returns { success: true, message: "...", data: [...] or {...}, meta: {...} }
      // This interceptor pulls the inner 'data' out so controllers don't have to worry about it.
      if (response.data && typeof response.data === 'object' && response.data.hasOwnProperty('data')) {
        // Carry over meta if it exists (very useful for pagination)
        if (response.data.meta) {
            response.originalMeta = response.data.meta;
        }
        response.data = response.data.data;
      }
      return response;
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