//= require_tree services
angular.module("services", [])
  .service("promiseWire", ["socket", "$q", "$log", function(socket, Q, $log){
    function Wire(options){
      var my = this;
      my.socketPrefix = options.socketPrefix;

      my.getEvent = this.socketPrefix + ":get";
      my.putEvent = this.socketPrefix + ":put";
      my.postEvent = this.socketPrefix + ":post";
      my.deleteEvent = this.socketPrefix + ":delete";

      my.deferred = {};
      my.deferred.get = Q.defer();
      my.deferred.put = Q.defer();
      my.deferred.post = Q.defer();
      my.deferred.delete = Q.defer();

      my.promises = {};
      my.promises.get = my.deferred.get.promise;
      my.promises.put = my.deferred.put.promise;
      my.promises.post = my.deferred.post.promise;
      my.promises.delete = my.deferred.delete.promise;

      function resetPromise(which){
        my.deferred[which] = Q.defer();
        my.promises[which] = my.deferred[which].promise;
      }

      socket.on(this.getEvent, function(data){
        my.deferred.get.resolve(data);
        resetPromise("get");
      })

      socket.on(this.putEvent, function(data){
        my.deferred.put.resolve(data);
        resetPromise("put");
      })

      socket.on(this.postEvent, function(data){
        my.deferred.post.resolve(data);
        resetPromise("post");
      })

      socket.on(this.deleteEvent, function(data){
        my.deferred.delete.resolve(data);
        resetPromise("delete");
      })



    }

    Wire.prototype.get = function(data){
      if(!angular.isDefined(data)) data = {};
      socket.emit(this.getEvent, data);
    }

    Wire.prototype.put = function(data){
      if(!angular.isDefined(data)) data = {};
      socket.emit(this.putEvent, data);
    }

    Wire.prototype.post = function(data){
      if(!angular.isDefined(data)) data = {};
      socket.emit(this.postEvent, data);
    }

    Wire.prototype.delete = function(data){
      if(!angular.isDefined(data)) data = {};
      socket.emit(this.deleteEvent, data);
    }

    return {
      getInstance: function(options){
        return new Wire(options);
      }
    }
  }])

/** @service
 *  Represents a wire that connects a controller, a service, and the server-side socket infrastructure, all wrapped up in a REST-like API.
 */
    .service("wire", ["socket", "$q", "$log", function(socket, Q, $log){


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
            $log.info("Opening wire with prefix: "+this.socketPrefix);

            this.init = angular.isDefined(options.init) ? options.init : false;

            /* Standard REST events */
            this.getEvent = this.socketPrefix + ":" + "get";
            this.putEvent = this.socketPrefix + ":" + "put";
            this.deleteEvent = this.socketPrefix + ":" + "delete";
            this.postEvent = this.socketPrefix + ":" + "post";

            /* An error event */
            this.errorEvent = this.socketPrefix + ":" + "error";

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

            socket.on(this.errorEvent, function(data){
                $log.error(data);
            });

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
            socket.removeListener(this.errorEvent);
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

        }


        return {
            getInstance: function(options, room){
                return new Wire(options, room);
            }
        };

    }])
    .service("references", ["$http", 'socket', function($http, socket){
        var service = {};
        service.items = [];



        service.get = function(sectionName, itemName){
            service.items = [];         //clear this out
            socket.emit("references:get", {section: sectionName, item: itemName});
            //return $http.get("/api/references/"+sectionName+"/"+itemName);
        }

        service.add = function(sectionName, itemName, reference){
            socket.emit("references:put", {section: sectionName, item: itemName, reference: reference});
        }

        service.remove = function(sectionName, itemName, reference){
            socket.emit("references:delete", {section: sectionName, item: itemName, reference: reference});
        }

        //NO LONGER USED
        service.addLine = function(sectionName, itemName, reference){
            socket.emit("references:post", {section: sectionName, item: itemName, reference: reference});
        }

        service.editLine = function(sectionName, itemName, reference, submit){
            if(!angular.isDefined(submit)) submit = false;
            reference.editing = !submit;
            if(submit){         //submit the edit
                socket.emit("references:post", {section: sectionName, item: itemName, reference: reference});
            }
        }

        return service;

    }])
    .service("documents", ["wire", "$rootScope", function(Wire, $rootScope){
        var service = {};

        service.filenames = [];

        service.wire = Wire.getInstance({
            init: false,
            socketPrefix: "documents",
            entity: service,
            collection: "filenames"
        });


        return service;

    }])

    .service("navMenuService", ["socket", "$http", "$location", "$q", "$routeParams", "wire", "$rootScope", function(socket, $http, $location, Q, $routeParams, Wire, $rootScope){



        /**
         * Tries to keep the menu and URL in sync with the application state.
         * Example: if an item is deleted, the menu and the URL may have to change.
         */

        var service = {};

        /*service.wire = Wire.getInstance({
            socketPrefix: "sections",
            entity: service,
            collection: "parts",
            init: true,
            callbacks: {
                get: function(data){
                    service.connection = {on: true};
                },
                put: function(data){
                    service.parts.sections.push(data.name);
                    service.newSection = "";
                },
                after: function(data, method){          //after a socket event, we update location
                    if(method == "get"){
                        service.updateLocation();
                        $rootScope.$on("$routeChangeSuccess", function(){
                            service.updateLocation();
                        })
                    }
                }
            }
        });*/


        service.deferred = Q.defer();

        service.getPromise = function(){
            return service.deferred.promise;
        }

        /**
         * Updates the URL, based on the menu settings
         */
        service.updateLocation = function(){

            var sectionName = $routeParams.sectionName, subSectionName = $routeParams.subSectionName;
            try {
                service.findSubsectionAndDoSomething(sectionName, {name: subSectionName}, function(section, subSection, index){
                    //$rootScope.$apply(function(){
                        service.activeId = subSection._id;
                        service.activeSection = section;
                        service.deferred.resolve(service.activeId);
                    //})

                })



            } catch (e){
                /*if(e.indexOf("Subsection") > -1){           //the subsection no longer exists

                }*/
                $location.replace();
                $location.path("/");
                service.activeId = null;
            }
        }

        /**
         * Finds a subSection and does something with it.
         * @param sectionName String
         * @param subSectionMatch {} Matching criteria for underscore's _.findWhere method
         * @param fn Function The function to call.
         */
        service.findSubsectionAndDoSomething = function(sectionName, subSectionMatch, fn){
            var deferred = Q.defer();

            if(!angular.isDefined(service.parts.items[sectionName])) throw new Error("Section " + sectionName + " not found.")

            var subSection = _.findWhere(service.parts.items[sectionName], subSectionMatch);
            if(!subSection){
                throw new Error("Subsection not found.");
            } else {
                var index = service.parts.items[sectionName].indexOf(subSection);
                if(index == -1) {
                    throw new Error("Index not found (we shouldn't really get here.");
                } else {
                    fn(service.parts.items[sectionName], service.parts.items[sectionName][index], index);
                }
            }

        }

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
        //socket.emit("sections:get");

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

;