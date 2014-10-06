


function DocsCtrl($scope, $http){
  $scope.ctrl = {
    activeModuleName: '', //active Module
    activeModule: undefined,
    setActive: function(module){
      this.activeModuleName = module.name;
      this.activeModule = module;
    },
    activeTab: 0
  };



  $http({method: 'GET', url: '/docs.json'}).
    success(function(data, status, headers, config) {
      $scope.modules = data;
      console.log('data', data);
    }).
    error(function(data, status, headers, config) {
      // called asynchronously if an error occurs
      // or server returns response with an error status.
    });  
}

angular.module('docsApp', [])
.controller('DocsCtrl', DocsCtrl);



