/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/16/13
 * Time: 4:00 PM
 * To change this template use File | Settings | File Templates.
 */
angular.module("ReferenceController", []).controller("ReferenceCtrl", ["$scope", "$http", "$location", function($scope, $http, $location){
    $scope.part = $location.search().s;
    $scope.section = $location.search().ss;

    $http.get("/api/references/"+$scope.part+"/"+$scope.section).success(function(data){
        $scope.references = data;
    })
}]);