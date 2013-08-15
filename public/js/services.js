//= require_tree services
angular.module("services", [])
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
    .service("documents", ["$http", "socket", "wire", function($http, socket, wire){
        var service = {};

        service.filenames = [];

        service.get = function(sectionName, itemName){
            service.filenames = [];
            socket.emit("documents:get", {sectionName: sectionName, itemName: itemName});
        }

        service.put = function(sectionName, itemName, document){
            socket.emit("documents:put", {sectionName: sectionName, itemName: itemName, document: document});
        }

        service.delete = function(sectionName, itemName, document){
            socket.emit("documents:delete", {sectionName: sectionName, itemName: itemName, document: document});
        }

        return service;

    }])

    .service("navMenuService", ["socket", "$http", "$location", "$q", "$routeParams", function(socket, $http, $location, Q, $routeParams){



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
        /**
         * Updates the URL, based on the menu settings
         */
        service.updateLocation = function(){
            console.log("Updating location");
            var sectionName = $routeParams.sectionName, subSectionName = $routeParams.subSectionName;
            try {
                service.findSubsectionAndDoSomething(sectionName, {name: subSectionName}, function(section, subSection, index){
                    service.activeId = subSection._id;
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