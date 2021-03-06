angular.module("ConstitutionExplorer", ["ui.bootstrap", "btford.socket-io", "services", "controllers", "filters"])
    .config(["$locationProvider", "$routeProvider", function($locationProvider, $routeProvider){
        $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix("!");
        $routeProvider
            .when("/", {
                templateUrl: '/templates/index',
                controller: "IndexCtrl",
                reloadOnSearch: true
            })
    }])
    .service("navMenuService", ["socket", "$http", "$location", function(socket, $http, $location){


        /**
         * Tries to keep the menu and URL in sync with the application state.
         * Example: if an item is deleted, the menu and the URL may have to change.
         */
        function checkMenu(){
            var locationItem = $location.search().ss;
            var locationSection = $location.search().s;
            var item = _.findWhere(service.parts.items[locationSection], {name: locationItem });

            if(!item){
                $location.replace();
                service.flags.active.section = null;
                service.flags.active.item = null;
                $location.search("s", null);
                $location.search("ss", null);
            }
        }
        var service = {};
        service.parts = {};
        service.parts.items = {};
        service.parts.sections = [];
        service.activeItem = null;

        service.flags = {};                 //This holds editing flags and the like, separate from parts, so that these can be changed without rerendering the whole menu
        service.flags.active = {};
        service.flags.editing = [];
        service.flags.newName = "";

        /**
         * Fired when all sections are received.
         */
        socket.on("sections", function(sections){

            //clear out old items and sections
            service.parts.sections = [];
            service.parts.items = {};
            service.parts.sections = _.pluck(sections, "name");
            _.each(sections, function(section){
                service.parts.items[section.name] = [];
                _.each(section.subSections, function(subSection){
                    service.parts.items[section.name].push({name: subSection.name, _id: subSection._id});
                });
                //service.items[section.name] = section.subSections;
            });

            var locationSection = $location.search().s;
            var locationSubSection = $location.search().ss;
            var sectionIndex = _.indexOf(service.parts.sections, locationSection );
            if(sectionIndex == -1){
                $location.replace();
                service.flags.active.section = null;
                service.flags.active.item = null;
                $location.search("s", null);
                $location.search("ss", null);
                return;
            }          //The section no longer exists, probably because it was deleted

            var locationItem = $location.search().ss;
            //var locationSection = $location.search().s;
            var item = _.findWhere(service.parts.items[locationSection], {name: locationItem });

            if(!item){
                $location.replace();
                service.flags.active.section = null;
                service.flags.active.item = null;
                $location.search("s", null);
                $location.search("ss", null);
            }

        });

        /**
         * Fired when a single new section is received, or a replacement section if one is edited
         */
        socket.on("section:new", function(section){

            var index = _.indexOf(service.parts.sections, section.name);
            if(index < 0){            //section did not already exist, so just add it
                service.parts.sections.push(section.name);
            } else {                  //this section already exists, so replace it
                service.parts.sections[index] = section.name;
                service.parts.items[service.parts.sections[index]] = section.subSections;
                checkMenu();

            }
        })

        //Fires when a new item is received
        //Obj is: {section: the name of the section, item: the new item added}
        socket.on("item:new", function(obj){
            if(!angular.isDefined(service.parts.items[obj.section])) service.parts.items[obj.section] = [];

            var itemToUpdate = _.findWhere(service.parts.items[obj.section], {_id: obj.item._id});

            if(!itemToUpdate) {
                service.parts.items[obj.section].push(obj.item);    //new item
            } else {  //old item. Update it.
                var index = _.indexOf(service.parts.items[obj.section], itemToUpdate);
                service.parts.items[obj.section][index] = obj.item;
                //$location.search("ss", obj.item.name);
            }
            checkMenu();

        });

        /* Get the sections from the server */
        socket.emit("sections:get");

        service.deleteSection = function(section){

            socket.emit("sections:delete", {name: section.name});
        }



        service.addItem = function(section){
            //section.name = the name of the section to add the item under, section.newItem = the name of the new item
            socket.emit("items:create", {section: section.name, item: section.newItem});
        }


        service.deleteItem = function(section, item){
            socket.emit("items:delete", {section: section.name, item: item});
        }

        service.editing = function(item, section){
            if(arguments.length == 0) return false;

            var itemIndex = _.indexOf(service.parts.items[section.name], item);
            return service.flags.editing[itemIndex];
        }

        service.editItem = function(item, section, submit ){
            item.editing = !submit;
            if(!submit){
                item.newName = item.name;
            } else {
                //create a temporary item
                var newItem = {};
                newItem.name = item.newName;       //the new name
                newItem._id = item._id;            //the OLD id
                socket.emit("items:edit", {section: section.name, item: newItem});
            }
        }



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
                                var html = "<li ng-repeat=\"item in items | orderBy:'name'\" ng-class='{active: (item.name == menu.flags.active.item && section.name == menu.flags.active.section)}'><a ng-href='/?s={{ section.name }}&ss={{ item.name }}' ng-show='!item.editing'>{{ item.name }}<span class='pull-right icons'><i class='icon-pencil' ng-click='menu.editItem(item, section, false)'></i><i class='icon-remove' ng-click='menu.deleteItem(section, item)'></i></span></a><form ng-show='item.editing' class='input-append'><input type='text' class='input-small' ng-model='item.newName'><button class='btn' ng-click='menu.editItem(item, section, true)'>Submit</button></form></li>";
                                html += "<li class='input-append'><form><label>Add section</label><input type='text' ng-model='section.newItem' class='input-small'><button class='btn' ng-click='menu.addItem(section)' ng-disabled='!section.newItem'>Submit</button></form></li>";
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