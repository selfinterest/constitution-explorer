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
        name: {type: String, index: {unique: true, sparse: true, dropDups: true}},
        references: [referenceSchema]
    });

    var sectionSchema = new Schema({
        name: {type: String, index: { unique: true, dropDups: true, sparse: true }},
        subSections: [subSectionSchema]
    })

    sectionSchema.statics.getAll = function(){
        var deferred = Q.defer();
        this.find(function(err, results){
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