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

        return service;

    }])
;