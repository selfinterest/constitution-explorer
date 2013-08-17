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
        title: {type: String, required: true},
        lines: {type: String},
        paragraph: {type: String},
        pdfPages: {type: String, required: true},
        pages: {type: String, required: true},
        volume: {type: String},
        full: {type: String, required: true},
        date: {type: Date},
        filename: {type: String, required: true}        //store this, but don't get it from the user
    });

    var filenameSchema = new Schema({
        name: {type: String, required: true},// unique: true, dropDups: true, sparse: true}, //, unique: true, sparse: true, dropDups: true},
        title: {type: String, required: true},// unique: true, sparse: true, dropDups: true},
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

    subSectionSchema.pre("remove", function(next){
        //find the section that owns this subSection
        Models.section.update({subSections: this._id}, {$pull: {
            subSections: this._id
        }}, function(err){
            if(err) winston.error(err);
            next();
        })
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
        this.find().sort({"name": "asc"}).select({"subSections.filenames": 0})
            .populate({path: "subSections", model: Models.subSection, select: {"filenames": false}})
            .exec(function(err, results){
                if(err){
                    winston.error(err);
                    deferred.reject(new Error(err));
                } else {
                    var response = {};
                    response.sections = [];
                    response.items = {};

                    _.each(results, function(r){
                        response.items[r.name] = _.sortBy(r.subSections, "name");
                        response.sections.push(r.name);
                    });

                    if(response.sections.length < 1) response.sections = [];

                    deferred.resolve(response);
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

    subSectionSchema.statics.put = function(sectionName, subSectionName){
        var model = this;
        var deferred = Q.defer();
        var subSection = new Models.subSection({name: subSectionName});

        //Find the section to save this subsection under

        Models.section.findOne({name: sectionName}, function(err, section){

           if(err) throw new Error(err);
           if(section){
               subSection.save(function(err, subSection){
                   if(err) throw new Error(err);
                   section.subSections.push(subSection);
                   section.save(function(err, section){
                       if(err) throw new Error(err);
                       deferred.resolve({sectionName: sectionName, subSection: subSection});
                   })
               })
           } else {
               winston.error("Section name %s not found", sectionName);
               deferred.resolve({ok: false});
           }

        });
        return deferred.promise;
    }

    subSectionSchema.statics.post = function(sectionName, subSection){
        var deferred = Q.defer();
        this.findByIdAndUpdate(subSection._id, {name: subSection.newName}, function(err, subSection){
            if(err) throw new Error(err);
            deferred.resolve({sectionName: sectionName, subSection: subSection});
        })

        return deferred.promise;
    }

    subSectionSchema.statics.delete = function(sectionName, subSection){
        var deferred = Q.defer();

        this.findById(subSection._id, function(err, subSection){
            if(err) throw new Error(err);
            subSection.remove(function(err){
                if(err) throw new Error(err);
                console.log(sectionName);
                console.log(subSection);
                //console.log("Section name is %s and subSection is %o", sectionName, subSection);
                deferred.resolve({sectionName: sectionName, subSection: subSection});
            })
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


    /*subSectionSchema.statics.delete = function(section, item){
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
    };*/


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

    subSectionSchema.statics.getAllDocuments = function(sectionName, subSectionName, subSectionId){
        var deferred = Q.defer();

        this.findById(subSectionId)
            .populate({path: "filenames.references"})
            .exec(function(err, subSection){
                deferred.resolve(subSection.filenames);
            });
        /*Models.section.findOne({name: sectionName})
            .populate({path: "subSections", model: Models.subSection, select: {"filenames.references": false}})
            //.populate("subSections", {match: {"$elemMatch": {name: subSectionName }} })
            .exec(function(err, section){
                if(section){
                    var subSection = _.findWhere(section.subSections, {name: subSectionName});
                    if(subSection) {
                        subSection.populate({path: "references", model: Models.reference}, function(err, subSection){

                            deferred.resolve(subSection.filenames);
                        })
                    } else {
                        deferred.reject("HMM!");
                    }
                } else {
                    deferred.reject("HMM!");
                }
            });*/
        return deferred.promise;
    }

    subSectionSchema.statics.putDocument = function(subSectionId, document){
        var deferred = Q.defer();
        var model = this;
        //console.log("Creating document: %s %o", subSectionName, document);
        //console.log(arguments);
        this.findByIdAndUpdate(
            subSectionId,
            {$push:
                {
                    filenames: {name: document.filename, title: document.title, references: []}
                }
            }).exec(function(){
                model.findById(subSectionId, "-filenames.references", function(err, subSection){
                    deferred.resolve(subSection.filenames);
                })
            })
        return deferred.promise;
    }

    subSectionSchema.statics.deleteDocument = function(subSectionId, name){
        var deferred = Q.defer();
        var model = this;
        this.findByIdAndUpdate(
            subSectionId,
            {$pull:
                {
                    filenames: {name: name}
                }

            }).exec(function(){
                model.findById(subSectionId, "-filenames.references", function(err, subSection){
                    deferred.resolve(subSection.filenames);
                })
            }
        )

        return deferred.promise;
    }

    referenceSchema.statics.putReference = function(reference, subSectionId){
        var deferred = Q.defer();

        try {
            Models.reference.create(reference, function(err, reference){
                if(err){
                    err.reference = reference;
                    throw new Error(err);
                }
                Models.subSection.findOneAndUpdate({"_id": subSectionId, "filenames.name": reference.filename},
                    {"$push":
                    {"filenames.$.references": reference._id}
                    }
                ).exec(function(err){
                    if(err){
                        err.reference = reference;
                        throw new Error(err);
                    } else {
                        deferred.resolve(reference);
                    }
                })
            });
        } catch (e){
            //delete the reference, if one was made
            if(e.reference){
                e.reference.remove(function(){
                    deferred.reject(e);
                })
            } else {
                deferred.reject(e);
            }
        }

        /*var referenceModel = new Models.reference(reference);
        try {
            Models.subSection.findByIdAndUpdate(subSectionId, {""} function(err, subSection){
                if(err) deferred.reject(new Error(err));
                _.each(subSection.filenames, function(filename, i){
                    if(filename.name == reference.filename){
                        referenceModel.save(function(err, referenceModel){
                            if(err) deferred.reject(new Error(err));
                            subSection.filenames[i].references.push(referenceModel._id);
                            subSection.save(function(err){
                                if(err) deferred.reject(new Error(err));
                                deferred.resolve(referenceModel);
                            });
                        })
                    }
                });
            });
        } catch (e){
            deferred.reject(new Error(e));
        }*/
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