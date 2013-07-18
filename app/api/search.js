/**
 * Created with JetBrains PhpStorm.
 * User: terrence
 * Date: 7/16/13
 * Time: 7:43 PM
 * To change this template use File | Settings | File Templates.
 */
define(["q", "winston"], function(Q, winston){
    var url = "http://localhost:9200/documents";
    var rest = require('rest');
    var client = require('rest/client/node');

    function performSearch(str, page){
        var size = 10;
        var from = page * size;

        //Form a request body

        var request = {path: url + "/_search", method: "POST"};
        request.entity = JSON.stringify({
            query: {
                query_string: {
                    query: str,
                    "use_dis_max":true,
                    "defaultOperator":"AND"
                },
                size: size,
                from: from,
                sort: "title.raw"
            }
        })
        //var request = {path: url + "/_search?q="+str+"from="+from+"&size="+size, method: 'GET'};

        return client(request);
    }
    return {
        get: function(req, res){
            /*var from = typeof(req.body.from) != "undefined" ? req.body.from : 0;
            var size = typeof(req.body.size) != "undefined" ? req.body.size : 20;*/
            var page = typeof(req.body.page) != "undefined" ? req.body.page : 0;

            performSearch(req.body.s, page).then(
                function(response){
                    if(response.status.code == 200){
                        res.send({results: JSON.parse(response.entity), ok: true});
                    } else {
                        console.log(response);
                        res.send({ok: false})
                    }
                },
                function(err){
                    winston.error("REST ERROR");
                    winston.error(err);
                    res.send({ok: false});
                }
            )

        }
    }
})