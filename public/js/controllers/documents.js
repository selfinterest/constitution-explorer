/**
 * Created by: Terrence C. Watson
 * Date: 8/12/13
 * Time: 2:04 PM
 */
angular.module("DocumentsController", [])
    .controller("DocumentsCtrl", ["$scope", "$routeParams", "documents", "navMenuService", function($scope, $routeParams, documents, navMenu){
        //$scope.part = $location.search().s;
        //$scope.section = $location.search().ss;


        $scope.documents = documents;           //this gives me access to the wire, the collection, etc.

        //navMenu.findSubsectionAndDoSomething($routeParams.sectionName, {name: $routeParams.subSectionName},
        //    function(section, subSection, index){
                documents.wire.subscribe("/"+$routeParams.sectionName + "/" + $routeParams.subSectionName).then(function(){
                    documents.wire.get({sectionName: $routeParams.sectionName, subSectionName: $routeParams.subSectionName});
                    $scope.sectionName = $routeParams.sectionName;
                    $scope.subSectionName = $routeParams.subSectionName;
                })
            //}
        //)



        $scope.deleteDocument = function(document){
            navMenu.findSubsectionAndDoSomething($routeParams.sectionName, {name: $routeParams.subSectionName}, function(section, subSection){
                documents.wire.delete({id: subSection._id, subSectionName: $routeParams.subSectionName, sectionName: $routeParams.sectionName, name: document.name });
            })

        }
        $scope.$on("$destroy", function(){
            documents.wire.unsubscribe();
        })

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