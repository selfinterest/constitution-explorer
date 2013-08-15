angular.module("ConstitutionExplorer", ["ui.bootstrap", "btford.socket-io", "services", "controllers", "filters"])
    .config(["$locationProvider", "$routeProvider", function($locationProvider, $routeProvider){
        $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix("!");
        $routeProvider
            .when("/:sectionName/:subSectionName", {
                templateUrl: '/templates/index',
                controller: "IndexCtrl",
                reloadOnSearch: true
            })
            .when("/:sectionName/:subSectionName/:filename", {
                templateUrl: "/templates/referenceView",
                controller: "ReferenceCtrl"
            })
            .when("/:sectionName/:subSectionName/:filename/:referenceId", {
                templateUrl: "/templates/referenceView",
                controller: "ReferenceCtrl"
            })
            .when("/", {
                templateUrl: "/templates/empty"
            })
    }])
    .run(["$rootScope", "navMenuService", function($rootScope, navMenu){
        /*$rootScope.$on("$routeChangeSuccess", function(){
            navMenu.updateLocation();
        })*/
    }])
    /** @factory
     *  Represents a wire that connects a controller, a service, and the server-side socket infrastructure
     */
    .service("wire", ["socket", "$q", function(socket, Q){


        function Wire(options, room){
            var my = this;

            this.subscribeDeferred = null;

            if(angular.isDefined(room)){
                this.room = room;
                socket.emit("subscribe", room);
            } else {
                this.room = null;
            }


            function serviceCollection(){
                return my.service[my.collection];
            }

            function setCollection(items){
                my.collection = items;
            }

            /** @var A reference to an object that houses the collection */
            this.entity = options.entity;

            /**
             * Name (index) of the collection within the entity.
             * @type String
             */
            this.collection = options.collection;



            /**
             * The socket prefix to use, e.g. "document" or "section"
             * @type String
             */
            this.socketPrefix = options.socketPrefix;


            this.init = angular.isDefined(options.init) ? options.init : false;

            /* Standard REST events */
            this.getEvent = this.socketPrefix + ":" + "get";
            this.putEvent = this.socketPrefix + ":" + "put";
            this.deleteEvent = this.socketPrefix + ":" + "delete";
            this.postEvent = this.socketPrefix + ":" + "post";

            this.getCb = null;
            this.putCb = null;
            this.deleteCb = null;
            this.postCb = null;



            if(angular.isDefined(options.callbacks)){
                this.getCb = angular.isFunction(options.callbacks.get) ? options.callbacks.get : null;
                this.putCb = angular.isFunction(options.callbacks.put) ? options.callbacks.put : null;
                this.deleteCb = angular.isFunction(options.callbacks.delete) ? options.callbacks.delete : null;
                this.postCb = angular.isFunction(options.callbacks.post) ? options.callbacks.post : null;
                this.after = angular.isFunction(options.callbacks.after) ? options.callbacks.after: null;
            }

            /**
             * Fires when items are received from the server, typically but not always in response to a get request from the client.
             * @return A promise
             */

            socket.on(this.getEvent, function(data){
                var promise = null;
                my.entity[my.collection] = data;

                if(my.getCb) {
                    promise = my.getCb(data);
                }

                if(my.after) Q.when(promise).then(my.after(data, "get"));

            });

            socket.on(this.putEvent, function(data){
                var promise = null;
                if(my.putCb) promise = my.putCb(data);
                if(my.after) Q.when(promise).then(my.after(data, "put"));
            });

            socket.on(this.postEvent, function(data){
                var promise = null;
                if(my.postCb) promise = my.postCb(data);
                if(my.after) Q.when(promise).then(my.after(data, "post"));

            })

            socket.on(this.deleteEvent, function(data){
                var promise = null;
                if(my.deleteCb) promise = my.deleteCb(data);
                if(my.after) Q.when(promise).then(my.after(data, "delete"));
            })

            socket.on("subscribe", function(data){
                if(my.subscribeDeferred){
                    my.subscribeDeferred.resolve(data);
                    my.subscribeDeferred = null;
                }
            });

            if(this.init) this.get();

            //console.log(my);
        }


        Wire.prototype.get = function(options){
            if(!angular.isDefined(options)) options = {};
            socket.emit(this.getEvent, options);
        }

        Wire.prototype.put = function(options){
            if(!angular.isDefined(options)) options = {};
            socket.emit(this.putEvent, options);
        }

        Wire.prototype.delete = function(options){
            if(!angular.isDefined(options)) options = {};
            socket.emit(this.deleteEvent, options);
        }

        Wire.prototype.post = function(options){
            if(!angular.isDefined(options)) options = {};
            socket.emit(this.postEvent, options);
        }

        Wire.prototype.removeListeners = function(){
            socket.removeListener(this.getEvent);
            socket.removeListener(this.putEvent);
            socket.removeListener(this.deleteEvent);
            socket.removeListener(this.postEvent);
        }

        Wire.prototype.subscribe = function(room){
            this.room = room;
            socket.emit("subscribe", this.room);
            this.subscribeDeferred = Q.defer();
            return this.subscribeDeferred.promise;
        }

        Wire.prototype.unsubscribe = function(){
            if(this.room){
                socket.emit("unsubscribe", this.room);
                this.room = null;
            }
            //Also remove listeners
            //this.removeListeners();
        }



        /*return {
            $get: function(){
                return Wire;
            }
        };*/

        return {
            getInstance: function(options, room){
                return new Wire(options, room);
            }
        };

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
                                    "<li ng-repeat=\"item in items | orderBy:'name'\" ng-class='{active: item._id == menu.activeId}'><a ng-href='/{{ section.name }}/{{ item.name }}' ng-show='!item.editing'>{{ item.name }}<span class='pull-right icons'><i class='icon-pencil' ng-click='editItem(item, section)'></i><i class='icon-remove' ng-click='subSectionWire.delete({sectionName: section.name, subSection: item})'></i></span></a><form ng-show='item.editing' class='input-append'><input type='text' class='input-small' ng-model='item.newName'><button class='btn' ng-click='subSectionWire.post({sectionName: section.name, subSection: item})'>Submit</button></form></li>";
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