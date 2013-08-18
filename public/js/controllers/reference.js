/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/16/13
 * Time: 4:00 PM
 * To change this template use File | Settings | File Templates.
 */
angular.module("ReferenceController", [])
    .controller("ReferenceCtrl", ["$scope", "wire", "$routeParams", "navMenuService", "$q", "$http", "$timeout", "$location", function($scope, wire, $routeParams, navMenu, Q, $http, $timeout, $location){

        function relocate() {
            $location.path("/" + $scope.sectionName + "/" + $scope.subSectionName);
        }

        $scope.wire = wire.getInstance({
            entity: $scope,
            collection: "reference",
            socketPrefix: "reference",
            init: false,
            callbacks: {
                put: function(data){
                    relocate();
                },
                post: function(){
                    relocate();
                },
                delete: function(){
                    relocate();
                }
            }
        });

        $scope.sectionName = $routeParams.sectionName;
        $scope.subSectionName = $routeParams.subSectionName;
        $scope.filename = $routeParams.filename;

        function getRoom(){
            return "/"+$scope.sectionName + "/" + $scope.subSectionName + "/" + $scope.filename;
        }


        $scope.referenceId = angular.isDefined($routeParams.referenceId) ? $routeParams.referenceId : "_null";


        function wrap(subSectionId){
            var deferred = Q.defer();
            $scope.subSectionId = navMenu.activeId;
            var filename = $routeParams.filename;
            return "/api/references/"+$scope.referenceId + "?sectionName="+$scope.sectionName + "&subSectionId="+$scope.subSectionId + "&filename="+filename;

        }

        navMenu.getPromise()
            .then(wrap)
            .then($http.get)
            .then(function(data){
                $scope.reference = data.data.reference;
                $scope.document = data.data.document;
                $scope.reference.filename = $routeParams.filename;
            });
        /*navMenu.getPromise().then(function(subSectionId){
            $scope.subSectionId = navMenu.activeId;
            var filename = $routeParams.filename;
            //$scope.wire.get({referenceId: $scope.referenceId, sectionName: $scope.sectionName, subSectionName: $scope.subSectionName, subSectionId: $scope.subSectionId, filename: filename});
            $http.get("/api/references/"+$scope.referenceId + "?sectionName="+$scope.sectionName + "&subSectionId="+$scope.subSectionId + "&filename="+filename).success(function(obj){
                $scope.reference = obj.reference;
                if(!angular.isDefined($scope.reference.filename)) $scope.reference.filename = filename;
                $scope.document = obj.document;
            })
        });*/

        /* Opens date picker */
        $scope.open = function() {
            $timeout(function() {
                $scope.opened = true;
            });
        };

        $scope.submit = function(){
            var data = {reference: $scope.reference, sectionName: $scope.sectionName, subSectionName: $scope.subSectionName, subSectionId: $scope.subSectionId};

            if($scope.referenceId == "_null"){
                $scope.wire.put(data);
            } else {
                $scope.wire.post(data);
            }
        }

        $scope.delete = function(){
            var data = {reference: $scope.reference, sectionName: $scope.sectionName, subSectionName: $scope.subSectionName, subSectionId: $scope.subSectionId};
            $scope.wire.delete(data);
        }

        $scope.$on("$destroy", function(){
            $scope.wire.removeListeners();
        });

        //$scope.numbersAndDashes = /[\d|\s]+/; //"[0-9|\,|\s]";

        $scope.numbersAndDashes = /[0-9\-]+/;
       // $scope.numbersAndDashes = /^\d(?:[-\s]?\d){6,11}$/;
        //$scope.numberAndDsahes = /^(?=[^ ]* ?[^ ]*(?: [^ ]*)?$)(?=[^-]*-?[^-]*$)(?=[^,]*,?[^,]*$)[a-zA-Z0-9 ,-]*$/;
}]);