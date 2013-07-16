/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/13/13
 * Time: 1:19 PM
 * To change this template use File | Settings | File Templates.
 */
define(["mongoose", "winston", "q"], function(mongoose, winston, Q){
    mongoose.connect("mongodb://localhost/originaldocuments");
    var Schema = mongoose.Schema;


    var documentSchema = new Schema({
        filename: String,
        title: String
    });

    var referenceSchema = new Schema({
        filename: {type: String},
        pages: String
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
        this.find().sort({"name": "asc"}).exec(function(err, results){
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