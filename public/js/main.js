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
    .service("navMenuService", [function(){
        function Item(id, items, active){
            if(!angular.isDefined(active)){
                active = false;
            }
            this.id = id;
            this.items = items;
            this.active = active;
        }
        var items = [ new Item("Part IV", ["17, 18"]), new Item("Part V", ["2, 3"])];
        return {
            sections: ["Part IV", "Part V"],
            items: {
                "Part IV":
                    ["17", "18"],
                "Part V":
                    ["2", "3"]
            }
        }
    }])
    .controller("NavCtrl", ["$scope", "navMenuService", function($scope, navMenu){
        $scope.menu = navMenu;
    }])
    .directive("navMenu2", ["navMenuService", "$compile", function(navMenu, $compile){
        return {
            restrict: "A",
            transclude: "element",
            compile: function(element, attr, linker){
                return function($scope, $element, $attr){
                    var parent = $element.parent();
                    $scope.menu = navMenu;
                    $scope.$watchCollection("menu.sections", function(sections){
                        for(var i = 0; i < sections.length; i++){
                            var $childScope = $scope.$new();
                            $childScope.items = $scope.menu.items[sections[i]];
                            $childScope.section = sections[i];
                            linker($childScope, function(clone){
                                //clone.text(navMenu.sections[i]);
                                parent.append(clone);
                                parent.append($compile("<li ng-repeat='item in items'><a href='#'>{{ item }}</a></li>")($childScope));
                            })
                        }
                    })



                }

            }
        }
    }])
    .directive("navMenu", ["navMenuService", function(navMenu){
        return {
            restrict: "A",
            compile: function(element, attr, linker){
                var sectionElm = [], itemElm = {};

                return function($scope, $element, $attr){
                    /**
                     * Resets all the items in a section, removing their DOM nodes
                     * @param sections
                     * @param i
                     */
                    function resetSection(sections, i){
                        sectionElm[i].remove();
                        if(angular.isDefined(itemElm[sections[i]])){
                            for(var p = 0; p < itemElm[sections[i]].length; p++){
                                itemElm[sections[i]][p].remove();
                            }
                        }
                        itemElm[sections[i]] = [];
                    }

                    function buildSection(sections, i){
                        var el = angular.element("<li class='nav-header'>"+sections[i]+"</li>");
                        $element.append(el);
                        sectionElm.push(el);
                        if(angular.isDefined(navMenu.items[sections[i]])){
                            for(var p = 0; p < navMenu.items[sections[i]].length; p++){
                                el = angular.element("<li>" + navMenu.items[sections[i]][p] + "</li>");
                                $element.append(el);
                                //if(!angular.isArray(itemElm[sections[i]][p])) itemElm[sections[i]][p] = [];
                                //itemElm[sections[i]][p].push(el);
                            }
                        }


                    }

                    $scope.menu = navMenu;
                    $scope.$watchCollection("menu.items", function(items){
                        console.log("Item watch firing");
                    })
                    $scope.$watchCollection("menu.sections", function(sections){
                        console.log("Watch firing");
                        //Remove all elements
                        if(sectionElm.length > 0){
                            for(var i = 0; i < sectionElm.length; i++){
                                resetSection(sections, i);
                            }
                            sectionElm = [];
                        }

                        for(var i = 0; i < sections.length; i++){
                            buildSection(sections, i);
                        }
                    })

                }



                /*return function($scope, $element, $attr){
                    var childScope = $scope.$new();
                    var parent = $element.parent();
                    $element.append("<li>Test4</li>");
                    element.append("<li>Test5</li>");
                    for(var i = 0; i < 2; i++){
                        linker(childScope, function(clone){
                            console.log("Is this running?");
                            console.log(clone);
                            element.append(clone);
                            clone.append("<li>Test</li>");
                            element.append("<li>Test2</li>");
                            $element.append("<li>Test3</li>")
                        })
                    }


                }*/
                /*for(var i = 0; i < navMenu.sections.length; i++){
                    element.append("<li>{{ menu.sections }}</li><li ng-repeat='item in menu.items'>{{ item }}</li>");
                }*/
            }
        }
    }])
    .controller("IndexCtrl", ["$scope", "navMenuService", function($scope, menu){
        $scope.test = "BLAH";
        $scope.addSection = function(){
            menu.sections.push("ANOTHER section");
            console.log("Added a section");
            console.log(menu);
        }

        $scope.addItem = function(){
            if(!angular.isDefined(menu.items["ANOTHER section"])){
                menu.items["ANOTHER section"] = [];
            }
            menu.items["ANOTHER section"].push("Another item");
        }
    }])
