/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/13/13
 * Time: 4:09 PM
 * To change this template use File | Settings | File Templates.
 */
angular.module("NavController", [])
    .controller("NavCtrl", ["$scope", "navMenuService", "socket", "$location", "wire", "$routeParams", "$q", function($scope, navMenu, socket, $location, Wire, $routeParams, Q){

        $scope.menu = navMenu;


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
                    $scope.newSection = "";
                },
                after: function(data, method){          //after a socket event, we update location
                    if(method == "get"){
                        navMenu.updateLocation();
                        $scope.$on("$routeChangeSuccess", function(){
                            navMenu.updateLocation();
                        })
                    }
                }
                /*after: function(data){
                    //We got sections, or put a new one in. Do a menu check.
                    var sectionName = $routeParams.sectionName, subSectionName = $routeParams.subSectionName;
                    //navMenu.activateSubsection(sectionName, {name: subSectionName})
                    navMenu.findSubsectionAndDoSomething(sectionName, {name: subSectionName}, function(section, subSection){
                        console.log(arguments);
                        if(section){
                            navMenu.activeId = subSection._id;
                        } else {
                            console.log("Redirecting");
                            $location.path("/");
                        }
                    })

                    $scope.routeEvent = $scope.$on("$routeChangeSuccess", function(){
                        console.log("Firing route event");
                        var sectionName = $routeParams.sectionName, subSectionName = $routeParams.subSectionName;
                        navMenu.findSubsectionAndDoSomething(sectionName, {name: subSectionName}, function(section, subSection){
                            if(section) navMenu.activeId = subSection._id;
                        })
                    });


                }*/
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
                    //var deferred = Q.defer();

                    navMenu.findSubsectionAndDoSomething(obj.sectionName, {_id: obj.subSection._id},
                        function(section, subSection, index){
                            navMenu.parts.items[obj.sectionName][index].name = obj.subSection.name;
                        }

                    );
                    //var subSectionToUpdate = _.findWhere(navMenu.parts.items[obj.sectionName], {_id: obj.subSection._id});
                    //var index = navMenu.parts.items[obj.sectionName].indexOf(subSectionToUpdate);
                    //navMenu.parts.items[obj.sectionName][index] = obj.subSection;
                    //return deferred.promise;
                },
                delete: function(obj){
                    navMenu.findSubsectionAndDoSomething(obj.sectionName, {_id: obj.subSection._id},
                        function(subSectionArray, subSection, index){
                            navMenu.parts.items[obj.sectionName] = _.without(subSectionArray, subSection);
                        })
                },
                after: function(data){
                    navMenu.updateLocation();
                }
            }
        });


        $scope.editItem = function(item, section){
            item.editing = true;
            item.newName = item.name;
        }

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