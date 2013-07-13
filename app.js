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
requirejs(["winston", "async", "http", "express.io", "app/db", "app/api/sections"], function(winston, async, http, express, db, sections){
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

            app.io.route("sections", {
                "get": function(req){
                    db.Models.section.find(function(err, results){
                        console.log(results);
                        if(err) winston.error(err);
                        req.io.emit("sections", results);
                    })
                }
            })

            callback();
        }


    ])
});