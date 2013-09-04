angular.module("ConstitutionExplorer", ["ui.bootstrap", "btford.socket-io", "services", "controllers", "filters"])
    .config(["$locationProvider", "$routeProvider", function($locationProvider, $routeProvider){
        $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix("!");
        $routeProvider
            .when("/editor/:sectionName/:subSectionName", {
                templateUrl: '/templates/index',
                controller: "IndexCtrl"
            })
            .when("/editor/:sectionName/:subSectionName/:filename/:referenceId", {
                templateUrl: "/templates/referenceView",
                controller: "ReferenceCtrl"
            })
            .when("/editor/:sectionName/:subSectionName/:filename", {
                templateUrl: "/templates/referenceView",
                controller: "ReferenceCtrl"
            })
            .when("/editor", {
                templateUrl: "/templates/empty",
                controller: "IndexCtrl"
            })
            .when("/viewer", {
                templateUrl: "/templates/viewer",
                controller: "ViewerCtrl"
            })
            .when("/users", {
                template: "<h1>Users</h1>"
            })
            .otherwise({
                redirectTo: "/editor"
            })
    }])
    .run(["$rootScope", "$location", "navMenuService", "user", function($rootScope, $location, navMenu, user){
        $rootScope.$on("$routeChangeSuccess", function(){
            var locationParts = $location.path().split("/");
            if(locationParts.length > 0){
                $rootScope.activeRoute = locationParts[1];
            }
            $rootScope.user = user;
            //navMenu.updateLocation();
        })
    }])



    .directive("navMenu2", ["navMenuService", "$compile", function(navMenu, $compile){
        return {
            restrict: "A",
            transclude: "element",
            compile: function(element, attr, linker){
                var sectionElms = [];
                var itemElms = {};
                return function($scope, $element, $attr){
                    var parent = $element.parent();
                    $scope.menu = navMenu;


                    $scope.$watch("menu.parts", function(menu){

                        if(!angular.isDefined(menu.sections)) return;
                        var i, $childScope, block;
                        var sections = menu.sections;

                        //clear all sections
                        parent.children().remove();             //we can simply remove all the children of the ul parent element
                        if(sectionElms.length > 0){
                            for(i = 0; i < sectionElms.length; i++){            //Destroy scopes so they don't hang around
                                sectionElms[i].scope.$destroy();
                            }
                            sectionElms = [];
                        }
                        for(i = 0; i < sections.length; i++){
                            $childScope = $scope.$new();
                            $childScope.items = angular.copy($scope.menu.parts.items[sections[i]]);     //copy menu section

                            $childScope.section = {name: sections[i], newItem: ""};
                            
                            linker($childScope, function(clone){
                                //clone.text(navMenu.sections[i]);
                                parent.append(clone);
                                var orderStr = "orderBy: 'item.name''";
                                var html =
                                    "<li ng-repeat=\"item in items | orderBy:'name'\" ng-class='{active: item._id == menu.activeId}'><a ng-href='/editor/{{ section.name }}/{{ item.name }}' ng-click='menu.activeId = item._id' ng-show='!item.editing'>{{ item.name }}<span class='pull-right icons'><i class='icon-pencil' ng-click='editItem(item, section)'></i><i class='icon-remove' ng-show='user.admin' ng-click='subSectionWire.delete({sectionName: section.name, subSection: item})'></i></span></a><form ng-show='item.editing' class='input-append'><input type='text' class='input-small' ng-model='item.newName'><button class='btn' ng-click='subSectionWire.post({sectionName: section.name, subSection: item})'>Submit</button></form></li>";
                                html +=
                                    "<li class='input-append'><form><label>Add section</label><input type='text' ng-model='section.newItem' class='input-small'><button class='btn' ng-click='subSectionWire.put({sectionName: section.name, subSectionName: section.newItem})' ng-disabled='!section.newItem'>Submit</button></form></li>";
                                //clone.after($compile(html)($childScope));
                                clone.after($compile(html)($childScope));
                                var block = {};
                                //We need to include the clone and any items added after it, so that all are deleted when the interface is rebuilt
                                block.el = clone;
                                block.scope = $childScope;
                                sectionElms.push(block);
                            })
                        }
                    }, true);      //true = watch value, false = watch reference

                }

            }
        }                           //end directive definition
    }])