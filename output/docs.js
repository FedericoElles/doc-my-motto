


function DocsCtrl($scope, $http, $location, $anchorScroll){
  $scope.ctrl = {
    activeModuleName: '', //active Module
    activeModule: undefined,
    setActive: function(module){
      this.activeModuleName = module.name;
      this.activeModule = module;
      $location.hash('top');
      $anchorScroll();
    },
    activeTab: 0,
    goto: function(id) {
      // set the location.hash to the id of
      // the element you wish to scroll to.
      $location.hash(id);

      // call $anchorScroll()
      $anchorScroll();
    }
  };



  $http({method: 'GET', url: '/docs.json'}).
    success(function(data, status, headers, config) {
      $scope.modules = data;
      $scope.ctrl.setActive(data[0]);
      console.log('data', data);
    }).
    error(function(data, status, headers, config) {
      // called asynchronously if an error occurs
      // or server returns response with an error status.
    });  
}



function codeLineDirective(){
 return {
    restrict: 'E',
    scope: {
      func: '='
    },
    templateUrl: 'codeLine.html'
  };  
}

angular.module('docsApp', [])
.controller('DocsCtrl', DocsCtrl)
.directive('codeLine', codeLineDirective);



