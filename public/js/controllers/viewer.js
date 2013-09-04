/**
 * Created by: Terrence C. Watson
 * Date: 9/4/13
 * Time: 6:24 AM
 */
angular.module("ViewerController", [])
    .controller("ViewerCtrl", ["$scope", "$http", function($scope, $http){
        $http.get("/api/viewer").success(function(data){
            $scope.data = data;
        });
    }]);