/**
 * Created by: Terrence C. Watson
 * Date: 8/12/13
 * Time: 2:04 PM
 */
angular.module("DocumentsController", [])
    .controller("DocumentsCtrl", ["$scope", "$routeParams", "documents", "navMenuService", "wire", function($scope, $routeParams, documents, navMenu, Wire){


        $scope.referenceWire = Wire.getInstance({
            entity: $scope,
            collection: "reference",
            socketPrefix: "reference",
            init: false,
            callbacks: {
                put: function(data){            //add the reference
                    var document = _.findWhere($scope.documents.filenames, {name: data.filename});
                    var index = _.indexOf($scope.documents.filenames, document);
                    $scope.documents.filenames[index].references.push(data);
                },
                post: function(data){           //replace the reference
                   var document = _.findWhere($scope.documents.filenames, {name: data.filename});
                   var index = _.indexOf($scope.documents.filenames, document);
                   var r = _.findWhere($scope.documents.filenames[index].references, {_id: data._id});
                   var i = _.indexOf($scope.documents.filenames[index].references, r);
                   $scope.documents.filenames[index].references[i] = data;
                }
            }
        });

        $scope.documents = documents;           //this gives me access to the wire, the collection, etc.

        navMenu.getPromise().then(function(){
            documents.wire.subscribe("/"+$routeParams.sectionName + "/" + $routeParams.subSectionName).then(function(){
                documents.wire.get({sectionName: $routeParams.sectionName, subSectionName: $routeParams.subSectionName, subSectionId: navMenu.activeId});
                $scope.sectionName = $routeParams.sectionName;
                $scope.subSectionName = $routeParams.subSectionName;
                $scope.subSectionId = navMenu.activeId;
                $scope.referenceWire.subscribe("/"+$scope.sectionName + "/" + $scope.subSectionName);
            });
        });
        //navMenu.findSubsectionAndDoSomething($routeParams.sectionName, {name: $routeParams.subSectionName},
        //    function(section, subSection, index){

            //}
        //)



        $scope.deleteDocument = function(document){
            navMenu.findSubsectionAndDoSomething($routeParams.sectionName, {name: $routeParams.subSectionName}, function(section, subSection){
                documents.wire.delete({id: subSection._id, subSectionName: $routeParams.subSectionName, sectionName: $routeParams.sectionName, name: document.name });
            })

        }

        $scope.$on("$destroy", function(){
            documents.wire.unsubscribe();
            $scope.referenceWire.unsubscribe();
            $scope.referenceWire.removeListeners();
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