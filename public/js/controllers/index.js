/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/16/13
 * Time: 1:40 AM
 * To change this template use File | Settings | File Templates.
 */
angular.module("IndexController", [])
    .controller("IndexCtrl", ["$scope", "navMenuService", "$http", "socket", function($scope, menu, $http, socket){


        $scope.test = menu.flags.active.section;
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
