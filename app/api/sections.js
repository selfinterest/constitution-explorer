/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/13/13
 * Time: 1:42 PM
 * To change this template use File | Settings | File Templates.
 */
define(["app/db", "winston"], function(db, winston){
    return {
        get: function(req, res){
            db.Models.section.find(function(err, results){
                if(err) winston.error(err);
                res.send(results);
            })
        },
        postSubSection: function(req, res){
            var id = req.params.id;
            var sectionId = req.params.sectionId;
            db.Models.section.findOne({name: sectionId}, function(err, section){
                if(err){
                    if(err) winston.error(err);
                    res.send({ok: false});
                } else if (!section){
                    res.send({ok: false});
                } else {
                    section.subSections.push({name: id})
                    section.save(function(err, subsection){
                        if(err){
                            winston.error(err);
                            res.send({ok: false});
                        } else {
                            res.send({ok: true, subsection: subsection});
                        }
                    });
                    /*section.save(function(err, subsection){

                    })*/
                }
            })
        },
        post: function(req, res){
            var id = req.params.id;
            var section = new db.Models.section({name: id});
            section.save(function(err){
                if(err){
                    winston.error(err);
                    res.send({ok: false});
                } else {
                    res.send({ok: true});
                }

            })
        }
    }
})