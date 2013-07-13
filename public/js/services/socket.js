/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/13/13
 * Time: 3:08 PM
 * To change this template use File | Settings | File Templates.
 */

angular.module("socketService", []).service("oldSocket", ["$location", "$rootScope", function($location, $rootScope){
    var service = {};

    service.connection = false;

    service._instance = io.connect($location.host());


    service.on = function(eventId, callback){
        service._instance.on(eventId, function(){
            var args = arguments;
            $rootScope.$apply(function(){
                callback.apply(service._instance, args);
            })

        });
    };

    service.emit = function(eventId){
        service._instance.emit(eventId, arguments.length > 1 ? arguments.slice(1) : null);        //send all arguments but the eventId, duh
    }

    service.on("connection", function(){
        console.log("Got connection");
        service.connection = true;
    });

    service._instance.emit("connection:create");

    return service;

}]);