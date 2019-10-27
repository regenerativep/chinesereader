var fs = require("fs");
var WebSocket = require("ws");

var socket;

function parseTsvFile(filename)
{
    let fileString = fs.readFileSync(filename, "utf8");
    let lines = fileString.split("\r\n");
    let dict = {};
    for(let i = 0; i < lines.length; i++)
    {
        let line = lines[i];
        let parts = line.split("\t");
        let chars = parts[0];
        let pinyin = parts[3];
        let def = parts[4];
        dict[chars] = {
            word: chars,
            pinyin: pinyin,
            definition: def
        };
    }
    return dict;
}
function sendHSK(num)
{
    let hskDict = parseTsvFile("HSK Official With Definitions 2012 L" + num + ".txt");
    for(let key in hskDict)
    {
        let value = hskDict[key];
        socket.send(JSON.stringify({
            type: "set",
            column: "hsk" + num,
            row: key,
            item: value
        }));
    }
}
function receiveColumn(column)
{
    socket.on("open", () => {
        socket.send(JSON.stringify({
            type: "request",
            column: column
        }));
    });
    socket.on("message", (data) => {
        var dataObj = JSON.parse(data);
        let columnData = dataObj.column;
        for(let key in columnData)
        {
            console.log(key);
        }
    })
}
function reset()
{
    socket.send(JSON.stringify({
        type: "reset"
    }));
    sendHSK("1");
    sendHSK("2");
    sendHSK("3");
    sendHSK("4");
    sendHSK("5");
    sendHSK("6");
}
function main()
{
    socket = new WebSocket("ws://127.0.0.1:5524");
    socket.on("open", () => {
        reset();
        sendHSK("1");
        sendHSK("2");
        sendHSK("3");
        sendHSK("4");
        sendHSK("5");
        sendHSK("6");
        // receiveColumn("hsk1");
        // receiveColumn("hsk2");
    });
}
main();