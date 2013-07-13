/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/13/13
 * Time: 4:09 PM
 * To change this template use File | Settings | File Templates.
 */
angular.module("NavController", [])
    .controller("NavCtrl", ["$scope", "navMenuService", "socket", function($scope, navMenu, socket){
        $scope.menu = navMenu;
        $scope.connection = {on: false};

        socket.on("connection", function(){
            $scope.connection = {on: true};
            console.log("Got connection");
        });

        socket.emit("connection:get");


    }])