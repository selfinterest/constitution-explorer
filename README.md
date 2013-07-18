constitution-explorer
=====================

An application to link documents in our collection to different sections of the constitution. Since no one has access to our collection, here are some notable features:

(1) Websockets through Express.io are used to update application state among all users of the application.
(2) Angular.Js is used on the client side. There's a custom directive that emulates ng-repeat but allows repetition of large non-nested sections of HTML.
(3) Integration with ElasticSearch.
