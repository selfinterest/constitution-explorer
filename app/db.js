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
        //filename: {type: String, required: true},
        title: {type: String},
        lines: {type: String},
        paragraph: {type: String},
        pdfPage: {type: Number},
        page: {type: Number},
        volume: {type: String},
        full: {type: String}
    });

    var filenameSchema = new Schema({
        name: {type: String, required: true},
        references: [{type: Schema.Types.ObjectId, ref: "Reference"}]
    });

    var subSectionSchema = new Schema({
        name: {type: String},
        filenames: [filenameSchema]
    });

    var sectionSchema = new Schema({
        name: {type: String, index: { unique: true, dropDups: true, sparse: true }},
        subSections: [{type: Schema.Types.ObjectId, ref: "Subsection"}]
    });

    //MIDDLEWARE
    sectionSchema.pre("remove", function(next){
        _.each(this.subSections, function(subSection){
            subSection.remove();
        });

        next();
    });

    /*subSectionSchema.pre("remove", function(next){
        _.each(this.filenames, function(filename){

        })
    });*/



    /**
     * Returns all sections and subsections
     * @returns deferred, resolved with an array of objects (sections containing subsections.)
     */
    sectionSchema.statics.getAll = function(){
        var deferred = Q.defer();
        this.find().sort({"name": "asc"}).select({"subSections.references": false})
            .populate({path: "subSections", model: Models.subSection})
            .exec(function(err, results){
            if(err){
                winston.error(err);
                deferred.reject(new Error(err));
            } else {
                deferred.resolve(results);
            }
        })

        return deferred.promise;
    }

    /**
     * Creates a new section
     * @param name The name of the section to create
     * @returns Deferred. Resolves with results of the database call
     */
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

    /**
     * Deletes a section
     * @param name The name of the section to delete
     * @returns Deferred. Resolved with a list of all sections.
     */
    sectionSchema.statics.delete = function(name){
        var model = this;
        var deferred = Q.defer();

        this.findOne({name: name})
            .populate("subSections")
            .exec(function(err, section){
                section.remove(function(err){
                    if(err){
                        winston.error(err)
                    } else {
                        model.getAll().then(function(results){
                            deferred.resolve(results);
                        });
                    }

                });

            })

        return deferred.promise;
    }

    /**
     * Adds item itemName to section sectionName
     * @param sectionName
     * @param itemName
     * @returns deferred. Resolves to the model of the new item added
     */
    sectionSchema.statics.addItem = function(sectionName, itemName){
        var model = this;
        var deferred = Q.defer();
        this.findOne({name: sectionName}, function(err, section){
            if(err){
                winston.error(err);
                deferred.reject(new Error(err));
            } else {
                //create a subsection
                var subSection = new Models.subSection({name: itemName});
                //Save the subsection
                subSection.save(function(err){
                    section.subSections.push(subSection._id);               //push the subsection id onto the array
                    section.save(function(err, results){                    //save the section, with its updated array
                        if(err){
                            winston.error(err);
                            deferred.reject(new Error(err));
                        } else {
                            deferred.resolve({section: sectionName, item: subSection});
                        }
                    });
                })


            }
        })

        return deferred.promise;
    }

    /**
     * Edits an item (changes its name)
     * @param sectionName The name of the section containing the item
     * @param item The item to edit {name: the name, _id: the id}
     * @returns {*}
     */
    sectionSchema.statics.editItem = function(sectionName, item){
        var deferred = Q.defer();
        Models.subSection.findByIdAndUpdate(item._id, {name: item.name}, function(err, updatedItem){
            if(err){
                winston.error(err);
                deferred.reject(new Error(err));
            } else {
                deferred.resolve({section: sectionName, item: updatedItem});
            }
        });
        /*this.findOne({name: sectionName}, function(err, section){
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
        })*/

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


    subSectionSchema.statics.delete = function(section, item){
        var deferred = Q.defer();

        //Delete the item
        this.findById(item._id, function(err, subSection){
           //remove the subSection
            if(subSection){
                subSection.remove();
                //Now find the reference to the subSection in the section and delete that as well
                Models.section.update({"name": section},
                    {"$pull":
                    {"subSections": {id: item._id}}
                    }, function(err, numAffected, raw){
                        console.log(arguments);
                        deferred.resolve(raw);
                    })

            } else {
                winston.error("Id of the subsection was not found.");
                deferred.reject("Id of the subsection was not found");
            }

        });

        return deferred.promise;
    };


    /**
     * Removes an item from a section
     * @param sectionName
     * @param item {} item.name: the name of the item, item.id: its database id.
     */
    sectionSchema.statics.deleteItem = function(sectionName, item){
        var deferred = Q.defer();

        var model = this;

        this.findOne({name: sectionName})
            .populate("subSections")
            .exec(function(err, section){
            section.subSections.pull(item._id);                         //this removes the item reference from the array
            section.save(function(err, results){                        //Now remove the actual item
                Models.subSection.findOne( {_id: item._id}, function(err, item){
                    //Remove the actual item
                    item.remove();
                    model.findOne({name: sectionName})
                        .populate("subSections")
                        .exec(function(err, results){
                            deferred.resolve(results);
                        })
                })

                //deferred.resolve(results);
            })
        });
        //console.log(arguments);
        /*this.findOne({name: sectionName})
            .populate({
                path: "subSections",
                model: Models.subSection
            })
            .exec(function(err, section){
                console.log(section);
                section.id(item._id).remove();
                section.save(function(err, results){
                    if(err){
                        winston.error(err);
                        deferred.reject(new Error(err));
                    } else {
                        deferred.resolve(results);
                    }
                })
            });
        /*this.findOne({name: sectionName}, function(err, section){

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

        })*/
        return deferred.promise;
    }


    var Models = {
        section: mongoose.model("Section", sectionSchema ),
        reference: mongoose.model("Reference", referenceSchema),
        subSection: mongoose.model("Subsection", subSectionSchema)
    };

    return {
        Schemas: {
            reference: referenceSchema,
            section: sectionSchema,
            subSection: subSectionSchema
        },
        Models: Models
    }
});