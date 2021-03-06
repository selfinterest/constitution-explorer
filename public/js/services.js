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
;