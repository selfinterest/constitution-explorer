/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/16/13
 * Time: 1:40 AM
 * To change this template use File | Settings | File Templates.
 */
angular.module("IndexController", [])
    .controller("IndexCtrl", ["$scope", "navMenuService", "$http", "socket", "$routeParams", "$location", function($scope, menu, $http, socket, $routeParams, $location){

        //console.log(menu.activeSection);
        /*if(menu.activeId && menu.activeSection && !angular.isDefined($routeParams.sectionName)){
            console.log(menu.activeSection.name);
            try {
                menu.findSubsectionAndDoSomething(menu.activeSection.name, {_id: menu.activeId}, function(section, subSection){
                    //$location.replace();
                    //console.log(section);
                })
            } catch (e){
                console.log(e);
            }

        }*/
        //menu.activeId = $routeParams.subSectionId;

    }])
