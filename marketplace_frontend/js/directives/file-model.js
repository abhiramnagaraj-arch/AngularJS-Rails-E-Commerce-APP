angular.module("marketplaceApp").directive('fileModel', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var model = $parse(attrs.fileModel);
      var modelSetter = model.assign;

      element.bind('change', function () {
        scope.$apply(function () {
          var file = element[0].files[0];
          if (file) {
            // 5MB Limit
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
              alert("File too large. Maximum size is 5MB.");
              element.val(""); // Clear the input
              return;
            }
            modelSetter(scope, file);
          }
        });
      });
    }
  };
}]);
