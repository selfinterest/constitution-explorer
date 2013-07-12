angular.module("ConstitutionExplorer", ["ui.bootstrap"])
    .config(["$locationProvider", "$routeProvider", function($locationProvider, $routeProvider){
        $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix("!");
        $routeProvider
            .when("/", {
                templateUrl: '/templates/index',
                controller: "IndexCtrl"
            })
    }])
