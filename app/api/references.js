define(["app/db", "underscore", "async", "q"], function(db, _, async, Q){
    return {
        get: function(req, res){

            function getReference(referenceId){
                var deferred = Q.defer();

                if(referenceId != "_null"){     // looking up the reference
                    db.Models.reference.findById(referenceId, function(err, r){
                        deferred.resolve(r);
                    })
                } else {
                    deferred.resolve({});
                }

                return deferred.promise;
            }


            function getDocument(subSectionId, filename){

                var deferred = Q.defer();

                db.Models.subSection.findById(subSectionId, "-references", function(err, subSection){
                    if(err) console.log(err);
                    console.log(subSection);
                    console.log(_.findWhere(subSection.filenames, {name: filename}));
                    console.log("Filename is %s", filename);
                    deferred.resolve(_.findWhere(subSection.filenames, {name: filename }));
                })

                return deferred.promise;
            }


            var sectionName = req.query.sectionName;
            var subSectionId = req.query.subSectionId;
            var filename = req.query.filename;
            var referenceId = req.params.referenceId;
            var obj = {};

            getReference(referenceId)
                .then(function(reference){
                    obj.reference = reference;
                    getDocument(subSectionId, filename).then(function(document){
                        obj.document = document;
                        res.send(obj);
                    })
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