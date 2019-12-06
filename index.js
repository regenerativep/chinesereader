var fs = require("fs");
var express = require("express");
var http = require("http");
var sio = require("socket.io");
var port = require("./public/port.js");
var hskupdate = require("./hskupdate.js");

var database;
var changesMade = false;
var databaseFileName = "./database.json";
var expressApp, httpServer, ioServer;
function loadDatabase()
{
    if(fs.existsSync(databaseFileName))
    {
        console.log("loading database...");
        database = JSON.parse(fs.readFileSync(databaseFileName, "utf8"));
        console.log("loaded database");
    }
    else
    {
        regenerateDatabase();
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
function regenerateDatabase()
{
    database = {};
    console.log("regenerating database");
    let hskDicts = hskupdate.loadHSK();
    let fullDict = hskupdate.loadFullDict();
    for(let i = 0; i < hskDicts.length; i++)
    {
        let hskDict = hskDicts[i];
        database["hsk" + (i + 1)] = hskDict;
    }
    database["other"] = fullDict;
    changesMade = true;
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
        var originInformation = socket.request.connection.remoteFamily + " " + socket.request.connection.remoteAddress + " port " + socket.request.connection.remotePort;
        console.log("client connected ( " + originInformation + " )");
        socket.on("disconnect", () => {
            console.log("client disconnected ( " + originInformation + " )");
        });
        socket.on("set", (dataObj) => {
            let user = dataObj.username;
            let column = user + "_" + dataObj.column;
            let row = dataObj.row;
            let itemObj = dataObj.item;
            if(!database.hasOwnProperty(column))
            {
                database[column] = {}
            }
            database[column][row] = itemObj;
            console.log(column + ":" + row + " in database set ( " + originInformation + " )");
            changesMade = true;
        });
        socket.on("request", (dataObj) => {
            let column = dataObj.column;
            let columnData = {};
            let username = null;
            if(dataObj.hasOwnProperty("username"))
            {
                username = dataObj["username"];
                column = username + "_" + column;
            }
            if(database.hasOwnProperty(column))
            {
                columnData = database[column];
            }
            console.log(column + " in database returned to \"" + username + "\" ( " + originInformation + " )");
            socket.emit("column", {
                name: column,
                column: columnData
            });
        });
        socket.on("reset", () => {
            //database = {};
            //regenerateDatabase();
            changesMade = true;
        });
    });
    httpServer.listen(port, () => {
        console.log("server listening on port " + port);
    });
}
main();
