/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/13/13
 * Time: 4:09 PM
 * To change this template use File | Settings | File Templates.
 */
angular.module("NavController", [])
    .controller("NavCtrl", ["$scope", "navMenuService", "socket", "$location", "wire", function($scope, navMenu, socket, $location, Wire){

        $scope.menu = navMenu;

        //$scope.menu.parts.sections = ["BLAH"];

        $scope.wire = Wire.getInstance({
            socketPrefix: "sections",
            entity: navMenu,
            collection: "parts",
            init: true,
            callbacks: {
                get: function(data){
                    $scope.connection = {on: true};
                },
                put: function(data){
                    navMenu.parts.sections.push(data.name);
                }
            }
        });

        $scope.subSectionWire = Wire.getInstance({
            socketPrefix: "subSections",
            entity: navMenu.parts,
            collection: "items",
            init: false,                    //this means we do NOT invoke the get method on instantiation
                                            //And we don't do this because subSections will be retrieved through the first wire (section.)
            callbacks: {
                put: function(obj){
                    if(!angular.isDefined(navMenu.parts.items[obj.sectionName])) navMenu.parts.items[obj.sectionName] = [];
                    navMenu.parts.items[obj.sectionName].push(obj.subSection);
                },
                post: function(obj){
                    var subSectionToUpdate = _.findWhere(navMenu.parts.items[obj.sectionName], {_id: obj.subSection._id});
                    var index = navMenu.parts.items[obj.sectionName].indexOf(subSectionToUpdate);
                    navMenu.parts.items[obj.sectionName][index] = obj.subSection;
                },
                delete: function(obj){

                }
            }
        });


        $scope.editItem = function(item, section){
            item.editing = true;
            item.newName = item.name;
        }

       // $scope.wire.get();

        $scope.$on("$destroy", function(){
            $scope.wire.removeListeners();
            $scope.subSectionWire.removeListeners();
        })





        $scope.$watch(function(){ return $location.search()}, function(search){
            navMenu.flags.active.section = search.s;
            navMenu.flags.active.item  = search.ss;

        });



        $scope.connection = {on: false};


        /* Handlers for the new section segment of the menu */
        $scope.newSectionValid = false;

        $scope.newSection = "";

        $scope.validateNewSection = function(){
            $scope.newSectionValid =  ($scope.newSection != "") && (_.indexOf(navMenu.parts.sections, $scope.newSection) == -1);
        }

        $scope.addNewSection = function(){
            socket.emit("sections:create", {name: $scope.newSection});
            $scope.newSection = "";
        }

        $scope.editWhich = function(){
            //console.log("Firing");
        }

        socket.on("connection", function(){
            $scope.connection = {on: true};
            //console.log("Got connection");
        });

        //socket.emit("connection:get");


    }])