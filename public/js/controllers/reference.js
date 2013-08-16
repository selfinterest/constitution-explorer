/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/16/13
 * Time: 4:00 PM
 * To change this template use File | Settings | File Templates.
 */
angular.module("ReferenceController", [])
    .controller("ReferenceCtrl", ["$scope", "wire", "$routeParams", "navMenuService", "$q", "$http", "$timeout", function($scope, wire, $routeParams, navMenu, Q, $http, $timeout){
        /*$scope.wire = wire.getInstance({
            entity: $scope,
            collection: "references",
            socketPrefix: "references",
            init: false
        });*/

        $scope.sectionName = $routeParams.sectionName;
        $scope.subSectionName = $routeParams.subSectionName;
        $scope.filename = $routeParams.filename;

        function getRoom(){
            return "/"+$scope.sectionName + "/" + $scope.subSectionName + "/" + $scope.filename;
        }


        $scope.referenceId = angular.isDefined($routeParams.referenceId) ? $routeParams.referenceId : "_null";

        navMenu.getPromise().then(function(subSectionId){
            $scope.subSectionId = navMenu.activeId;
            var filename = $routeParams.filename;
            $http.get("/api/references/"+$scope.referenceId + "?sectionName="+$scope.sectionName + "&subSectionId="+$scope.subSectionId + "&filename="+filename).success(function(obj){
                $scope.reference = obj.reference;
                $scope.document = obj.document;
            })
        })

        /* Opens date picker */
        $scope.open = function() {
            $timeout(function() {
                $scope.opened = !$scope.opened;
            });
        };

        $scope.submit = function(){
            console.log("Submitting");
            console.log($scope.referenceForm);
        }

        //$scope.numbersAndDashes = /[\d|\s]+/; //"[0-9|\,|\s]";

        $scope.numbersAndDashes = /[0-9\-]+/;
       // $scope.numbersAndDashes = /^\d(?:[-\s]?\d){6,11}$/;
        //$scope.numberAndDsahes = /^(?=[^ ]* ?[^ ]*(?: [^ ]*)?$)(?=[^-]*-?[^-]*$)(?=[^,]*,?[^,]*$)[a-zA-Z0-9 ,-]*$/;
}]);