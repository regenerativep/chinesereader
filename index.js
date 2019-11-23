var fs = require("fs");
var express = require("express");
var http = require("http");
var sio = require("socket.io");
var port = require("./public/port.js");

var database;
var changesMade = false;
var databaseFileName = "./database.json";
var expressApp, httpServer, ioServer;
function loadDatabase()
{
    if(fs.existsSync(databaseFileName))
    {
        database = JSON.parse(fs.readFileSync(databaseFileName, "utf8"));
    }
    else
    {
        database = {};
    }
}
function saveDatabase()
{
    if(changesMade)
    {
        let jsonString = JSON.stringify(database);
        fs.writeFileSync(databaseFileName, jsonString, "utf8");
        console.log("saved database");
        changesMade = false;
    }
}
function main()
{
    loadDatabase();
    setInterval(saveDatabase, 10000);

    expressApp = express();
    httpServer = http.createServer(expressApp);
    ioServer = sio(httpServer);

    expressApp.use(express.static("public"));
    ioServer.on("connection", (socket) => {
        console.log("received connection from a client");
        socket.on("disconnect", () => { console.log("closed connection to a client"); })
        socket.on("set", (dataObj) => {
            let column = dataObj.column;
            let row = dataObj.row;
            let itemObj = dataObj.item;
            if(!database.hasOwnProperty(column))
            {
                database[column] = {}
            }
            database[column][row] = itemObj;
            changesMade = true;
        });
        socket.on("request", (dataObj) => {
            let column = dataObj.column;
            let columnData = {};
            if(database.hasOwnProperty(column))
            {
                columnData = database[column];
            }
            socket.emit("column", {
                name: column,
                column: columnData
            });
        });
        socket.on("reset", () => {
            database = {};
            changesMade = true;
        });
    });
    httpServer.listen(port, () => {
        console.log("server listening on port " + port);
    });
}
main();
