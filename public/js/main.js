angular.module("ConstitutionExplorer", ["ui.bootstrap", "btford.socket-io", "services", "controllers"])
    .config(["$locationProvider", "$routeProvider", function($locationProvider, $routeProvider){
        $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix("!");
        $routeProvider
            .when("/", {
                templateUrl: '/templates/index',
                controller: "IndexCtrl"
            })
    }])
    .service("navMenuService", ["socket", "$http", function(socket, $http){
        function Item(id, items, active){
            if(!angular.isDefined(active)){
                active = false;
            }
            this.id = id;
            this.items = items;
            this.active = active;
        }

        var service = {};
        service.items = {};
        service.sections = [];

        /**
         * Fired when all sections are received.
         */
        socket.on("sections", function(sections){
            service.sections = _.pluck(sections, "name");
            _.each(sections, function(section){
                service.items[section.name] = section.subSections;
            })
        });

        /**
         * Fired when a single new section is received.
         */
        socket.on("section:new", function(section){
            service.sections.push(section.name);
        })

        /* Get the sections from the server */
        socket.emit("sections:get");

        service.deleteSection = function(sectionId){
            socket.emit("sections:delete", {name: sectionId});
        }

        /*var service = {};
        service.sections = [];
        service.items = {};
        $http.get("/api/sections").success(function(data){
            service.sections = _.pluck(data, "name");
            _.each(data, function(section){
                service.items[section.name] = section.subSections;
            })
            console.log(service);

        })*/

        return service;

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


                    $scope.$watch("menu", function(menu){

                        if(!angular.isDefined(menu.sections)) return;
                        var i, $childScope, block;
                        var sections = menu.sections;
                        //clear all sections
                        if(sectionElms.length > 0){
                            for(i = 0; i < sectionElms.length; i++){

                                sectionElms[i].el.remove();
                                //sectionElms[i].el.find().remove();
                                sectionElms[i].scope.items = [];
                                //sectionElms[i].scope.$destroy();
                            }
                            sectionElms = [];
                        }
                        for(i = 0; i < sections.length; i++){
                            $childScope = $scope.$new();
                            $childScope.items = $scope.menu.items[sections[i]];
                            $childScope.section = sections[i];
                            linker($childScope, function(clone){
                                //clone.text(navMenu.sections[i]);
                                parent.append(clone);
                                clone.after($compile("<li ng-repeat='item in items'><a href='#'>{{ item.name }}</a></li><li><input type='text'></li>")($childScope));
                                var block = {};
                                block.el = clone;
                                block.scope = $childScope;
                                sectionElms.push(block);
                            })
                        }
                    }, true);

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
    .controller("IndexCtrl", ["$scope", "navMenuService", "$http", "socket", function($scope, menu, $http, socket){
        $scope.test = "BLAH";
        $scope.counter = 0;
        $scope.counter2 = 0;
        $scope.addSection = function(){
            socket.emit("sections:create", {name: "NEW SECTION2"});
        }

        $scope.addItemToNewSection = function(){
            var itemIndex = "NEW SECTION";


            $http.post("/api/sections/"+itemIndex+"/New item").success(function(data){
                if(!angular.isDefined(menu.items[itemIndex])){
                    menu.items[itemIndex] = [];
                }
                menu.items[itemIndex].push(data.subsection);
            })
        }

        $scope.addItem = function(){
            console.log("Adding an item");
            var itemIndex = "Part IV";
            if(!angular.isDefined(menu.items[itemIndex])){
                menu.items[itemIndex] = [];
            }
            //menu.items["ANOTHER section"].push("Another item");*/
            menu.items[itemIndex].push($scope.counter);
            $scope.counter++;
        }
    }])
