var express = require('express'),
    http = require('http'),
    app = express(),
    server = http.createServer(app),
    path = "./output",
    port = 5000;
// Configuration of our application
app.use(express.static(path));
// Starting the server and tell them everything's ok!
server.listen(port);
console.log("Express is serving " + path + " listening on port " + port);