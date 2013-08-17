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
            var reference = req.body.reference;
            var subSectionId = req.body.subSectionId;
            db.Models.reference.putReference(reference, subSectionId)
                .then(
                    function(reference){
                        //res.send(reference);
                        req.io.route("references:put", reference);
                    },
                    function(err){
                        res.status(400).send(err);
                    }
            );

        },

        post: function(req, res){
            var referenceId = req.params.referenceId;
            var reference = req.body.reference;
            delete reference._id;           //have to delete the id, boo.
            db.Models.reference.findByIdAndUpdate(referenceId, reference, function(err, reference){
                console.log(err);
                req.io.route("references:post");
                //res.send(reference);
            });
        }
    }
})