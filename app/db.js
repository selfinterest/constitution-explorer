/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/13/13
 * Time: 1:19 PM
 * To change this template use File | Settings | File Templates.
 */
define(["mongoose", "winston", "q", "underscore"], function(mongoose, winston, Q, _){
    mongoose.connect("mongodb://localhost/originaldocuments");
    var Schema = mongoose.Schema;


    var documentSchema = new Schema({
        filename: String,
        title: String
    });

    var referenceSchema = new Schema({
        filename: {type: String},
        title: {type: String},
        lines: {type: String}
    });

    var subSectionSchema = new Schema({
        name: {type: String},
        references: [referenceSchema]
    });

    var sectionSchema = new Schema({
        name: {type: String, index: { unique: true, dropDups: true, sparse: true }},
        subSections: [subSectionSchema]
    });

    sectionSchema.statics.getAll = function(){
        var deferred = Q.defer();
        this.find().sort({"name": "asc"}).select({"subSections.references": false}).exec(function(err, results){
            if(err){
                winston.error(err);
                deferred.reject(new Error(err));
            } else {
                deferred.resolve(results);
            }
        })

        return deferred.promise;
    }

    sectionSchema.statics.create = function(name){
        var section = new this({name: name});
        var deferred = Q.defer();
        section.save(function(err, results){
            if(err){
                winston.error(err);
                deferred.reject(new Error(err));
            } else {
                deferred.resolve(results);
            }
        })

        return deferred.promise;
    }

    sectionSchema.statics.delete = function(name){
        var model = this;
        var deferred = Q.defer();
        this.remove({name: name}, function(err){
            if(err){
                winston.error(err);
            }

            //send back all sections
            model.getAll().then(function(results){
                deferred.resolve(results)
            })
        })

        return deferred.promise;
    }

    sectionSchema.statics.addItem = function(sectionName, itemName){
        var model = this;
        var deferred = Q.defer();
        this.findOne({name: sectionName}, function(err, section){
            if(err){
                winston.error(err);
                deferred.reject(new Error(err));
            } else {
                section.subSections.push({name: itemName});
                section.save(function(err, results){
                    if(err){
                        winston.error(err);
                        deferred.reject(new Error(err));
                    } else {
                        deferred.resolve(results);
                    }
                });
            }
        })

        return deferred.promise;
    }

    sectionSchema.statics.editItem = function(sectionName, item){
        var deferred = Q.defer();
        this.findOne({name: sectionName}, function(err, section){
            try {
                section.subSections.id(item._id).name = item.name;
                section.save(function(err, results){
                    if(err){
                        winston.error(err);
                        deferred.reject(new Error(err));
                    } else {
                        deferred.resolve(results);
                    }
                })
            } catch (error){
                winston.error(error);
                deferred.reject(new Error(error));
            }
        })

        return deferred.promise;
    }

    sectionSchema.statics.getReferences = function(section, subSection){

        var deferred = Q.defer();

        this.findOne({"name": section, "subSections.name": subSection}, {'subSections.$': 1}, function(err, section){
            if(err){
                winston.error(err);
                deferred.reject(new Error(err));
            } else {
                if(!section){
                    deferred.resolve([]);
                } else {
                    deferred.resolve(section.subSections[0].references);
                }

            }

        })

        return deferred.promise;
    }

    sectionSchema.statics.putReference = function(section, subSection, filename, title, lines){
        var deferred = Q.defer();

        if(!lines) lines = ""
        this.update({"name": section, "subSections.name": subSection},
            {"$addToSet":                                       //$addToSet = add to array unless already there
            {"subSections.$.references": {filename: filename, title: title, lines: lines}}
            }, {upsert: true}, function(err, numAffected, raw){
            if(err) winston.error(err);
            deferred.resolve(raw);
        });

        return deferred.promise;
    }

    sectionSchema.statics.removeReference = function(section, subSection, filename){
        var deferred = Q.defer();
        this.update({"name": section, "subSections.name": subSection},
            {"$pull":
            {"subSections.$.references": {filename: filename}}
            }, function(err, numAffected, raw){
                if(err) winston.error(err);
                deferred.resolve(raw);
            }
        )

        return deferred.promise;
    }

    sectionSchema.statics.editLine = function(section, subSection, filename, reference){
        var deferred = Q.defer();
        var model = this;
        /* Sigh. We have to do it this way. Remove the old reference. Add a totally new one. */
        model.removeReference(section, subSection, reference.filename)
            .then(function(){
                model.putReference(section, subSection, reference.filename, reference.title, reference.lines)
                    .then(function(err, numAffected, raw){
                        deferred.resolve(raw);
                    })
            })

        /*this.update({"name": section, "subSections.name": subSection},
            {"$pull":
                {"subSections.$.references": {filename: filename}}
        }, function(){

        });*/
        //console.log(arguments);
        /*this.findOne({"name": section, "subSections.name": subSection, "subSections.references.filename": filename}, {'subSections.references.$': 1}, function(err, section){
        //this.findOne({name: section, "subSections.name": subSection, "subSections.$.references": {"$elemMatch": {filename: filename}}}, function(err, section){
            /* At this point, section.subSections[0] is the parent document of the references document we need */


         //   console.log(section.subSections[0].references);

            //console.log(section);
            //console.log(section.subSections[0].references);
            /*_.each(section.subSections[0].references, function(ref, index){
                if(ref.filename == filename){
                    section.subSections[0].references[index].lines = reference.lines;
                }
            })
            section.save( function(section){
                deferred.resolve(section)
            })*/
            //console.log(section.subSections.references.id(reference._id));
        //})
        return deferred.promise;
    }

    /*sectionSchema.statics.addLine = function(section, subSection, filename, line){
        var deferred = Q.defer();
        //The positional operator can't do deep enough for us. We need to do this a slow, stupid way
        this.findOne({"name": section, "subSections.name": subSection, "subSections.references.filename": filename}, function(section){
            section.
        });


        this.update({"name": section, "subSections.name": subSection, "subSections.references.filename": filename},
            {"$addToSet":
                {"subSections.$.references.$.pages": line}
            }, function(err, numAffected, raw){
                if(err) winston.error(err);
                deferred.resolve(raw)
            });

        return deferred.promise;
    }*/



    /**
     * Removes an item from a section
     * @param sectionName
     * @param item {} item.name: the name of the item, item.id: its database id.
     */
    sectionSchema.statics.deleteItem = function(sectionName, item){
        var deferred = Q.defer();
        //console.log(arguments);
        this.findOne({name: sectionName}, function(err, section){

            try {
                section.subSections.id(item._id).remove();
                section.save(function(err, results){
                    if(err){
                        winston.error(err);
                        deferred.reject(new Error(err));
                    } else {
                        deferred.resolve(results);
                    }
                })
            } catch (error){    //this probably just means the item was already removed
                winston.error(error);
                deferred.reject(new Error(error));
            }

        })
        return deferred.promise;
    }

    return {
        Schemas: {
            reference: referenceSchema,
            section: sectionSchema,
            subSection: subSectionSchema
        },
        Models: {
            section: mongoose.model("Section", sectionSchema ),
            reference: mongoose.model("Reference", referenceSchema),
            subSection: mongoose.model("Subsection", subSectionSchema)
        }
    }
});