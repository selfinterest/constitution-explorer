/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/16/13
 * Time: 4:00 PM
 * To change this template use File | Settings | File Templates.
 */
angular.module("ReferenceController", [])
    .controller("ReferenceCtrl", ["$scope", "$http", "$location", "socket", "references", function($scope, $http, $location, socket, references){
        $scope.part = $location.search().s;
        $scope.section = $location.search().ss;
        $scope.references = references;

        references.items = [];

        references.get($scope.part, $scope.section);



        var socketEvent = "references:"+$scope.part+":"+$scope.section;

        var socketEventNew = "references:"+$scope.part+":"+$scope.section+":new";

        socket.on(socketEvent, function(data){          //data will be a new item
            if(data.results.length == 0){
                references.items = [];
            } else {
                references.items = data.results;
                //references.items.push(data.results[0]);
            }
        });


        $scope.$on("$destroy", function(){
            socket.removeListener(socketEvent);
            socket.removeListener(socketEventNew);
        });
}]);