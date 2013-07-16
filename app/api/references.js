define(["app/db"], function(db){
    return {
        get: function(req, res){
            var section = req.params.part;
            var subSection = req.params.section;
            db.Models.section.getReferences(section, subSection).then(function(results){
                res.send(results);
            })
        }
    }
})