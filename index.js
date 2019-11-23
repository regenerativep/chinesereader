var fs = require("fs");
var express = require("express");
var http = require("http");
var sio = require("socket.io");

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
        socket.on("set", )
        socket.on('message', (data) => { //todo here
            let dataObj = JSON.parse(data);
            switch(dataObj.type)
            {
                case "set":
                {
                    let column = dataObj.column;
                    let row = dataObj.row;
                    let itemObj = dataObj.item;
                    if(!database.hasOwnProperty(column))
                    {
                        database[column] = {}
                    }
                    database[column][row] = itemObj;
                    changesMade = true;
                    break;
                }
                case "request":
                {
                    let column = dataObj.column;
                    let columnData = {};
                    if(database.hasOwnProperty(column))
                    {
                        columnData = database[column];
                    }
                    socket.send(JSON.stringify({
                        type: "column",
                        name: column,
                        column: columnData
                    }));
                    break;
                }
                case "reset":
                {
                    database = {};
                    changesMade = true;
                    break;
                }
            }
        });
    });
    let port = 8000;
    httpServer.listen(port, () => {
        console.log("server listening on port " + port);
    });
}
main();
