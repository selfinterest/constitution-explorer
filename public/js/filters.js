//= require_tree filters
angular.module("filters", []).
    filter("markReferences", ["references", function(references){
        /**
         * Items are the items to be marked. We mark those for which a reference exists.
         */
        return function(items){
            if(typeof(items) == "undefined") return [];
            var refFilename, filename, i;
            _.each(items, function(item, index){

                filename = item._source.filename;
                items[index].referenced = false;
                i = 0;
                while(items[index].referenced == false && i < references.items.length){
                    items[index].referenced = references.items[i].filename == filename;
                    i++;
                }
            });

            return items;
        }
    }])