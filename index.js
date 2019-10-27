var fs = require("fs");
var express = require("express");
var WebSocket = require("ws");

var database;
var changesMade = false;
var databaseFileName = "./database.json";
var socketServer, webServer;
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

    webServer = express();
    webServer.use(express.static("public"));
    webServer.listen(82, () => {console.log("server listening on port 82");});

    socketServer = new WebSocket.Server({
        port: 5524
    });
    socketServer.on("error", (err) => {console.log("something went wrong with ws server");});
    socketServer.on("connection", (socket, req) => {
        socket.on('message', (data) => {
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
}
main();