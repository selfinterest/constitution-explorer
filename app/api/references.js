define(["app/db", "underscore", "async", "q"], function(db, _, async, Q){
    return {
        get: function(req, res){
            var section = req.params.part;
            var subSection = req.params.section;
            db.Models.section.getReferences(section, subSection).then(function(results){
                var deferred = Q.defer();
                var eventName = "references:"+section+":"+subSection;
                req.io.emit("test", {name: "blah"});

                /*async.each(results, function(result, callback){
                    console.log(eventName);
                    console.log("Emiting event");
                    req.io.emit("references:"+section+":"+subSection, {name: "blah"});
                    callback();
                }, function(){
                    res.send({ok: true});
                })*/

                //res.send(results);
                return deferred.promise;
            }).then(function(){
                res.send({ok: true});
            })
        },

        put: function(req, res){
            var section = req.params.part;
            var subSection = req.params.section;
            var filename = req.params.filename;
            var title = req.body.title;
            db.Models.section.putReference(section, subSection, filename, title).then(function(results){
                //Look up the reference we JUST ADDED because of stupid reasons
                db.Models.section.findReferenceByFilename(section, subSection, filename).then(function(results){

                })
            });
        }
    }
})