/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/11/13
 * Time: 7:36 PM
 * To change this template use File | Settings | File Templates.
 */

var requirejs = require("requirejs");

/* Configure requirejs */
requirejs.config({
    //Pass the top-level main.js/index.js require
    //function to requirejs so that node modules
    //are loaded relative to the top-level JS file.
    nodeRequire: require
});

/* Bootstraps the application */
requirejs(["winston", "async", "http", "express.io", "app/db", "app/api/sections", "app/api/references", "app/api/search", "underscore"], function(winston, async, http, express, db, sections, references, search, _){
    winston.info("Bootstrapping application.");
    /**
     * Command line options and main application variable
     */
    var commandLn, app = express();
    var RedisStore = require('connect-redis')(express);
    var redis = require("redis").createClient();

    async.series([
        /**
         * Parse command line options
         * @param callback
         */
        function(callback){
            commandLn = require("optimist").argv;
            commandLn.port = commandLn.port || 3005;
            callback();
        },

        /**
         * Start and configure express
         * @param callback
         */
        function(callback){
            winston.info("Setting up express");
            app.set('port', commandLn.port || 3005);
            app.set('views', './views');
            app.set('view engine', 'jade');
            app.use(express.favicon('./public/img/favicon.png'));
            app.use(express.logger('dev'));
            app.use(express.bodyParser());
            app.use(express.methodOverride());
            app.use(require('less-middleware')({src: "./public"}));
            app.use(express.cookieParser('watson99'));
            app.use(require("connect-assets")({src: "./public"}));
            app.use(express.session({
                secret: "BLAHBLAHBLAH",
                store: new RedisStore({host: "localhost", port: 6379, client: redis})
            }));
            //app.use(express.session());
            //app.use(express.csrf());
            app.use(express.static('./public', { maxAge: 0 }));
            app.use(app.router);

            app.configure('development', function(){
                app.use(express.errorHandler());
            });

            /* Configure routing */

            app.get("/templates/:template", function(req, res){
                var template = req.params.template;
                res.render("templates/"+template, function(err, html){
                    if(!err)
                        res.send(html)
                    else {
                        console.log(err);
                        res.send(404);       //not found. This really shouldn't happen!
                    }

                })
            });

            app.get("/api/sections", sections.get);
            //app.get("/api/sections/:id", sections.getSubSection);
            app.post("/api/sections/:id", sections.post);
            app.post("/api/sections/:sectionId/:id", sections.postSubSection);


            app.get("/api/references/:part/:section", references.get);
            app.put("/api/references/:part/:section/:filename", references.put);

            app.post("/api/search", search.get);
            app.get("*", function(req, res){
                res.render("index");
                //res.send("Ok");
            });


            callback();
        },

        /**
         * Start HTTP server
         * @param callback
         */
        function(callback){
            winston.info("Starting http server on port "+commandLn.port);
            app.http().io();
            app.listen(commandLn.port);

            app.io.route('connection', {
                "get": function(req){
                    req.io.emit("connection");
                }
            });

            app.io.route("items", {
                "create": function(req){
                    //req.data.section = the name of the section, req.data.item = the name of the item to add
                    db.Models.section.addItem(req.data.section, req.data.item).then(
                        function(item){
                            app.io.broadcast("item:new", item);
                        }
                    );
                },
                "delete": function(req){
                    db.Models.section.deleteItem(req.data.section, req.data.item).then(
                        function(section){
                            app.io.broadcast("section:new", section);
                        }
                    )
                },
                "edit": function(req){
                    db.Models.section.editItem(req.data.section, req.data.item).then(
                        function(section){
                            app.io.broadcast("section:new", section);
                        }
                    )
                }
            })
            app.io.route("sections", {
                "get": function(req){
                    db.Models.section.getAll().then(
                        function(results){
                            //sort the results
                            _.each(results, function(section){
                                section.subSections = _.sortBy(section.subSections, "name");
                            });

                            req.io.emit("sections", results);
                        }
                    )
                },
                "create": function(req){
                    db.Models.section.create(req.data.name).then(
                        function(section){
                            app.io.broadcast("section:new", section);
                        }
                    )
                },
                "delete": function(req){
                    db.Models.section.delete(req.data.name).then(
                        function(results){
                            app.io.broadcast("sections", results);
                        }
                    )
                }
            });

            app.io.route("references", {
                "get": function(req){
                    var sectionName = req.data.section;
                    var itemName = req.data.item;
                    var eventName = "references" + ":" + sectionName + ":" + itemName;
                    db.Models.section.getReferences(sectionName, itemName).then(function(results){
                        req.io.emit(eventName, {results: results});
                    })
                },
                "put": function(req){
                    var sectionName = req.data.section;
                    var itemName = req.data.item;
                    var title = req.data.reference.title;
                    var filename = req.data.reference.filename;
                    var eventName = "references" + ":" + sectionName + ":" + itemName;
                    db.Models.section.putReference(sectionName, itemName, filename, title).then(function(results){
                        //Look up the all the references and send them back
                        db.Models.section.getReferences(sectionName, itemName).then(function(results){
                            app.io.broadcast(eventName, {results: results});
                        });
                        //app.io.broadcast(eventName)
                    });
                },
                "delete": function(req){
                    var sectionName = req.data.section;
                    var itemName = req.data.item;
                    var filename = req.data.reference.filename;
                    var eventName = "references:" + sectionName + ":" + itemName;
                    db.Models.section.removeReference(sectionName, itemName, filename).then(function(results){
                        db.Models.section.getReferences(sectionName, itemName).then(function(results){
                            app.io.broadcast(eventName, {results: results});
                        })
                    })
                },
                "post": function(req){
                    var sectionName = req.data.section;
                    var itemName = req.data.item;
                    var filename = req.data.reference.filename;
                    var line = req.data.reference.line;
                    var reference = req.data.reference;
                    var eventName = "references:" + sectionName + ":" + itemName;
                    db.Models.section.editLine(sectionName, itemName, filename, reference).then(function(results){
                        console.log(results);
                        db.Models.section.getReferences(sectionName, itemName).then(function(results){
                            app.io.broadcast(eventName, {results: results});
                        })
                    })
                }

            })

            callback();
        }


    ])
});