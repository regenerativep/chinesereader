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
        console.log("received connection from a client");
        socket.on("disconnect", () => { console.log("closed connection to a client"); })
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
