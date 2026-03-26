angular.module("marketplaceApp").factory("AuthService", function ($window, $rootScope, $http, $location) {

  const API = window.API_BASE;

  return {

    // =========================
    // TOKEN MANAGEMENT
    // =========================
    saveToken: function (token) {
      if (token && token.startsWith('Bearer ')) {
        token = token.substring(7);
      }
      $window.localStorage.setItem("auth_token", token);
    },

    getToken: function () {
      return $window.localStorage.getItem("auth_token");
    },

    removeToken: function () {
      $window.localStorage.removeItem("auth_token");
    },

    // =========================
    // USER MANAGEMENT
    // =========================
    saveUser: function (user) {
      $window.localStorage.setItem("user", JSON.stringify(user));
    },

    getUser: function () {
      const user = $window.localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    },

    removeUser: function () {
      $window.localStorage.removeItem("user");
    },

    // =========================
    // AUTH STATE
    // =========================
    isLoggedIn: function () {
      const token = this.getToken();
      return !!token && !this.isTokenExpired(token);
    },

    isTokenExpired: function (token) {
      if (!token) return true;
      try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse($window.atob(payloadBase64));
        const exp = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        return exp < now;
      } catch (e) {
        return true;
      }
    },

    // =========================
    // INTENDED ROUTE
    // =========================
    setIntendedRoute: function (path) {
      if (path === '/login' || path === '/signup') return;
      $window.sessionStorage.setItem("intended_route", path);
    },

    getIntendedRoute: function () {
      const path = $window.sessionStorage.getItem("intended_route");
      $window.sessionStorage.removeItem("intended_route");
      return path;
    },

    // =========================
    // 🔥 CORRECT LOGOUT
    // =========================
    logout: function () {
      const token = this.getToken();

      if (!token) {
        this.removeToken();
        this.removeUser();
        $rootScope.$broadcast("authChanged");
        $location.path("/login");
        return;
      }

      console.log("[AUTH] Calling backend logout...");

      return $http.delete(`${API}/auth/logout`)
        .then(() => {
          console.log("[AUTH] Logout success → token revoked");
        })
        .catch((err) => {
          console.error("[AUTH] Logout failed:", err);
        })
        .finally(() => {
          this.removeToken();
          this.removeUser();
          $rootScope.$broadcast("authChanged");
          $location.path("/login");
        });
    }
  };
});