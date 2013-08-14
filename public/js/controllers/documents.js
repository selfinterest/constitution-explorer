/**
 * Created by: Terrence C. Watson
 * Date: 8/12/13
 * Time: 2:04 PM
 */
angular.module("DocumentsController", [])
    .controller("DocumentsCtrl", ["$scope", "$location", "documents", "socket", "wire", function($scope, $location, documents, socket, Wire){
        $scope.part = $location.search().s;
        $scope.section = $location.search().ss;

        $scope.documents = documents;

        /*$scope.wire = Wire.getInstance({
            service: documents,
            collection: "items",
            socketPrefix: "documents"
        }, $scope.part + "/" + $scope.section);

        console.log($scope.wire);
        $scope.wire.get({sectionName: $scope.part, itemName: $scope.section});*/

        /*$scope.documents = documents;

        socket.on("documents:get", function(data){
            documents.items = data.documents;
        })

        $scope.$on("$destroy", function(){
            socket.removeListener("documents:get");
        })

        documents.get($scope.part, $scope.section);*/



}])