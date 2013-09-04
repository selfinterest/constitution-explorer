/**
 * Created by: Terrence C. Watson
 * Date: 9/4/13
 * Time: 6:28 AM
 */
define(["winston", "app/db", "async", "q"], function(winston, db, async, Q){
    function handleSections(sections){
        var deferred = Q.defer();
        async.each(sections, function(section, cb){
            deferred.resolve(section);
            cb();
        });
        return deferred.promise;
    }

    function handleSubsections(subSection){
        console.log(subSection.name);
    }

    function getReferenceStr(sectionName, subsectionName, reference){
        return sectionName + " " + subsectionName;
    }

    function getReferenceObject(sectionName, subSectionName, reference){

    }

    function sectionString(sectionName, subsectionName){
        return sectionName + " " + subsectionName;
    }

    return {
        get: function(req, res){

            db.Models.section.find({})
                .populate("subSections")
                .exec(function(err, results){

                    //references should look like this:
                    //references.sectionStrings = ["Part IV s. 2", "Part IV s.3"];
                    //references[sectionString] = [references]
                    var references = {};
                    references.sectionStrings = [];
                    references.references = {};
                    //res.send(results);
                    async.each(results, function(section, cbSection){
                        console.log("Processing section %s", section.name);
                        async.each(section.subSections, function(subSection, cbSubsection){
                            console.log("Processing subSection %s", subSection.name);
                            references.sectionStrings.push(sectionString(section.name, subSection.name));
                            if(!references.references[sectionString(section.name, subSection.name)]) references.references[sectionString(section.name, subSection.name)] = [];
                            async.each(subSection.filenames, function(filename, cbFilename){
                                console.log("Processing file %s", filename.name);
                                async.each(filename.references, function(reference, cbReference){
                                    console.log("Getting reference with id %s", reference);
                                    db.Models.reference.findById(reference, function(err, reference){

                                        //console.log("Got reference. The reference string is: %s", getReferenceStr(section.name, subSection.name, reference));
                                        //if(!references[getReferenceStr()]) references.getReferenceStr
                                        references.references[sectionString(section.name, subSection.name)].push(reference);
                                        cbReference();
                                    })
                                }, function(){
                                    cbFilename();
                                })
                            }, function(){
                                cbSubsection();
                            })
                        }, function(){
                            cbSection();
                        })
                    }, function(){
                        res.send(references);
                    })
                });
        }
    }
})