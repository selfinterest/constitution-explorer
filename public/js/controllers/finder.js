angular.module("FinderController", [])
    .controller("FinderCtrl", ["$scope", "$http", "navMenuService", function($scope, $http, menu){
        $scope.search = {};
        $scope.search.results = [];

        $scope.menu = menu;

        $scope.pagination = {};
        $scope.search.perform = function(page, newSearch){
            if(typeof(page) == "undefined"){
                page = 0 ;
            } else {
                page -= 1;          //pages are zero indexed in the search engine
            }
            if(typeof(newSearch) == "undefined") newSearch = true;
            $http.post("/api/search", {s: $scope.search.str, page: page}).success(function(data){
                if(data.ok){
                    $scope.search.results = data.results;
                    if(newSearch){
                        $scope.pagination.numPages = Math.ceil($scope.search.results.hits.total / 10);      //10 entries per page
                        $scope.pagination.currentPage = 1;
                        $scope.pagination.maxSize = 5;
                    }
                }
            })
        }

        $scope.addReference = function(hit){
            var section = menu.flags.active.section;
            var item = menu.flags.active.item;
            $http.put("/api/references/"+section + "/" + item + "/" + hit._source.filename).success(function(data){

            })
        }
    }])