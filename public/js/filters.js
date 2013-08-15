angular.module("filters", []).
    filter("markReferences", ["documents", function(documents){
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
                while(items[index].referenced == false && i < documents.filenames.length){
                    items[index].referenced = documents.filenames[i].name == filename;
                    i++;
                }
            });

            return items;
        }
    }])