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
requirejs(["winston", "async", "http", "express.io", "app/db", "app/api/sections", "app/api/references", "app/api/search", "underscore", "passport"], function(winston, async, http, express, db, sections, references, search, _, passport){
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
            app.use(passport.initialize());
            app.use(passport.session());
            app.use(app.router);

            app.configure('development', function(){
                app.use(express.errorHandler());
            });

            var BasicStrategy = require('passport-http').BasicStrategy;
            passport.use(new BasicStrategy(
                function(user, pass, callback){
                    try {
                        db.Models.user.findOne({name: user}, function(err, user){
                            if(err) return callback(err);
                            if(!user) return callback(null, false);
                            return user.comparePassword(pass, function(err, isMatch){
                                if(err) return callback(err);
                                if(!isMatch) return callback(null, false);
                                return callback(null, user);
                            });
                        });
                    } catch (e){
                        winston.error(e);
                        callback(null, false);
                    }
                }
            ));

            passport.serializeUser = function(user, done){
                done(null, {name: user.name, admin: user.admin});
                //done(null, })
            };

            passport.deserializeUser = function(user, done){
                db.Models.user.findOne({name: user.name}, function(err, user){
                    done(err, user);
                });
            }

            /* Configure authorization */

            var auth = require("express.io").basicAuth(function(user, pass, callback) {



                //var result = (user === 'charter12' && pass === 'scottreid!');
                //result = true;              //REMOVE THIS WHEN DEPLOYED!
                //callback(null /* error */, result);
            });

            app.all("*", function(req, res, next){

                next();
                /*if(req.remoteUser){

                }*/
            });
            /* Configure routing */

            app.all("*", passport.authenticate('basic', {session: true}));

            app.get("/templates/:template", function(req, res){
                var template = req.params.template;
                res.render("templates/"+template, function(err, html){
                    if(!err)
                        res.send(html);
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


            app.get("/api/references/:referenceId", references.get);
            app.put("/api/references", references.put);
            app.post("/api/references/:referenceId", references.post);
            //app.get("/api/references/:part/:section", references.get);
            //app.put("/api/references/:part/:section/:filename", references.put);

            app.post("/api/search", search.get);
            app.get("*", function(req, res){
                res.render("index", {
                    admin: req.user.admin
                });
                //res.send("Ok");
            });


            callback();
        },

        /**
         * Start HTTP server
         * @param callback
         */
        function(callback){
            app.http().io();
            winston.info("Starting http server on port "+commandLn.port);


            app.io.set("authorization", function(handshakeData, accept){

                var cookie = require("cookie");
                var connect = require("connect");
                if (handshakeData.headers.cookie) {

                    handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
                    try {

                        handshakeData.sessionID = connect.utils.parseSignedCookie(handshakeData.cookie['connect.sid'], 'watson99');

                        if (handshakeData.cookie['connect.sid'] == handshakeData.sessionID) {
                            return accept('Cookie is invalid.', false);
                        }
                    } catch (e){
                        console.log(handshakeData.cookie);
                        console.log(e);
                        return accept("Error occurred in authorization", false);
                    }


                } else {
                    return accept('No cookie transmitted.', false);
                }

                return accept(null, true);
            });

            app.listen(commandLn.port);

            app.io.route('subscribe', function(req, res){
                console.log("Client joining %s", req.data);
                req.io.join(req.data);
                req.io.emit("subscribe", req.data);
            });

            app.io.route("unsubscribe", function(req, res){
                console.log("Client leaving %s", req.data);
                req.io.leave(req.data);
            });

            app.io.route('connection', {
                "get": function(req){
                    req.io.emit("connection");
                }
            });

            app.io.route("subSections", {
                "put": function(req){
                    db.Models.subSection.put(req.data.sectionName, req.data.subSectionName).then(
                        function(obj){
                            app.io.broadcast("subSections:put", obj);        //obj = {sectionName, subSection}
                        }
                    )
                },
                "post": function(req){
                    db.Models.subSection.post(req.data.sectionName, req.data.subSection).then(
                        function(obj){
                            app.io.broadcast("subSections:post", obj);
                        }
                    )
                },

                "delete": function(req){
                    db.Models.subSection.delete(req.data.sectionName, req.data.subSection).then(
                        function(obj){
                            app.io.broadcast("subSections:delete", obj);
                        }
                    )
                }
            })
            app.io.route("items", {

                "put": function(req){
                    console.log(req.data);
                },
                "create": function(req){
                    //req.data.section = the name of the section, req.data.item = the name of the item to add
                    db.Models.section.addItem(req.data.section, req.data.item).then(
                        function(obj){            //{section: the section name, item: the item added}
                            app.io.broadcast("item:new", obj);
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
                        function(obj){          //{section: the section name, item: the item with its new name}
                            app.io.broadcast("item:new", obj);
                        }
                    )
                }
            })
            app.io.route("sections", {
                "get": function(req){
                    db.Models.section.getAll().then(
                        function(response){
                            //Parse the results out
                            /*var response = {};
                            response.sections = [];
                            response.items = {};

                            _.each(results, function(r){
                                response.items[r.name] = _.sortBy(r.subSections, "name");
                                response.sections.push(r.name);
                            });*/

                            req.io.emit("sections:get", response);
                        }
                    )
                },
                "put": function(req){
                    db.Models.section.create(req.data).then(
                        function(section){
                            app.io.broadcast("sections:put", section);
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
                        function(response){
                            app.io.broadcast("sections:get", response);
                        }
                    )
                }
            });

            app.io.route("reference", {
                "get": function(req){
                    var sectionName = req.data.sectionName;
                    var subSectionName = req.data.subSectionName;
                    var filename = req.data.filename;
                    var subSectionId = req.data.subSectionId;
                    var referenceId = req.data.referenceId != "_null" ? req.data.referenceId : null;
                    function getReference(referenceId){
                        var deferred = Q.defer();

                        if(referenceId){     // looking up the reference
                            db.Models.reference.findById(referenceId, function(err, r){
                                deferred.resolve(r);
                            })
                        } else {
                            deferred.resolve({});
                        }

                        return deferred.promise;
                    }

                    function getDocument(subSectionId, filename){

                        var deferred = Q.defer();

                        db.Models.subSection.findById(subSectionId, "-references", function(err, subSection){
                            if(err) console.log(err);
                            deferred.resolve(_.findWhere(subSection.filenames, {name: filename }));
                        });

                        return deferred.promise;
                    }

                    var Q = require("q");
                    Q.all(getReference(referenceId), getDocument(subSectionId, filename)).then(function(){

                    })

                },
                put: function(req){
                    var sectionName = req.data.sectionName;
                    var subSectionName = req.data.subSectionName;
                    var reference = req.data.reference;
                    var subSectionId = req.data.subSectionId;
                    db.Models.reference.putReference(reference, subSectionId)
                        .then(
                        function(reference){
                            //res.send(reference);
                            req.io.emit("reference:put", reference);                                                        //this goes to the current client, redirecting him to the main page
                            app.io.room("/"+sectionName + "/" + subSectionName).broadcast("reference:put", reference);      //this goes to all clients in the room, telling them to update their views
                        },
                        function(err){
                            req.io.emit("reference:error", err );
                        }
                    );
                },
                post: function(req){
                    var sectionName = req.data.sectionName;
                    var subSectionName = req.data.subSectionName;
                    var reference = req.data.reference;
                    var subSectionId = req.data.subSectionId;
                    var referenceId = reference._id;
                    delete reference._id;

                    db.Models.reference.findByIdAndUpdate(referenceId, reference, function(err, reference){
                        console.log(err);
                        req.io.emit("reference:post", reference);
                        app.io.room("/"+sectionName + "/" + subSectionName).broadcast("reference:post", reference);
                        //res.send(reference);
                    });
                },
                delete: function(req){
                    var sectionName = req.data.sectionName;
                    var subSectionName = req.data.subSectionName;
                    var reference = req.data.reference;
                    var subSectionId = req.data.subSectionId;
                    var referenceId = reference._id;

                    db.Models.reference.findById(referenceId, function(err, model){
                        if(err) req.io.emit("reference:error", err);
                        if(model){
                            model.remove(function(){
                                req.io.emit("reference:delete", reference);
                                app.io.room("/"+sectionName + "/" + subSectionName).broadcast("reference:delete", reference);
                            })
                        } else {

                        }
                    });
                }
            });
            app.io.route("references", {
                "get": function(req){
                    var sectionName = req.data.sectionName;
                    var subSectionName = req.data.subSectionName;
                    var filename = req.data.filename;
                    var subSectionId = req.data.subSectionId;

                    //var eventName = "references" + ":" + sectionName + ":" + itemName;
                    db.Models.filename.getReferences(subSectionId, filename).then(function(results){
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

            app.io.route("documents", {
                "get": function(req){
                    console.log("Getting documents");
                    var sectionName = req.data.sectionName;
                    var subSectionName = req.data.subSectionName;
                    var subSectionId = req.data.subSectionId;
                    db.Models.subSection.getAllDocuments(sectionName, subSectionName, subSectionId).then(function(documents){
                        //console.log(filenames);
                        req.io.emit("documents:get", documents);
                    })
                },
                "put": function(req){
                    /** @var The id of the subsection */
                    var subSectionId = req.data.id;

                    var subSectionName = req.data.subSectionName;

                    var sectionName = req.data.sectionName;


                    /** @var {} The document object, as returned from the search engine */
                    var document = req.data.document;



                    db.Models.subSection.putDocument(subSectionId, document).then(function(filenames){

                        app.io.room("/"+sectionName + "/" + subSectionName).broadcast("documents:get", filenames);
                        //app.io.broadcast("documents:get", {documents: subSection.filenames});
                    })

                },
                "delete": function(req){
                    var subSectionId = req.data.id, subSectionName = req.data.subSectionName, sectionName = req.data.sectionName, name = req.data.name;
                    db.Models.subSection.deleteDocument(subSectionId, name).then(function(filenames){
                        app.io.room("/"+sectionName + "/" + subSectionName).broadcast("documents:get", filenames);
                        //app.io.broadcast("documents:get", {documents: subSection.filenames})
                    })
                }
            })

            callback();
        }

    ])
});