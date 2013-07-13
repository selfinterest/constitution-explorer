/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/13/13
 * Time: 1:19 PM
 * To change this template use File | Settings | File Templates.
 */
define(["mongoose", "winston"], function(mongoose, winston){
    mongoose.connect("mongodb://localhost/originaldocuments");
    var Schema = mongoose.Schema;


    var documentSchema = new Schema({
        filename: String,
        title: String
    });

    var referenceSchema = new Schema({
        filename: {type: String, index: { unique: true }},
        pages: String
    });

    var subSectionSchema = new Schema({
        name: {type: String, index: { unique: true }},
        references: [referenceSchema]
    });

    var sectionSchema = new Schema({
        name: {type: String, index: { unique: true }},
        subSections: [subSectionSchema]
    })

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