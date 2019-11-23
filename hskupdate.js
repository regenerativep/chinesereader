var fs = require("fs");
var sio = require("socket.io-client");

var socket;
var vowels = ["iu", "a", "e", "i", "o", "u"];
var tonedVowels = [
    ["iū", "ā", "ē", "ī", "ō", "ū"],
    ["iú", "á", "é", "í", "ó", "ú"],
    ["iǔ", "ǎ", "ě", "ǐ", "ǒ", "ǔ"],
    ["iù", "à", "è", "ì​", "ò", "ù"],
    ["iu", "a", "e", "i", "o", "u"]
];
function getLowestVowel(字)
{
    for(let i = 0; i < vowels.length; i++)
    {
        let ind = 字.indexOf(vowels[i]);
        if(ind >= 0)
        {
            return i;
        }
    }
    return -1;
}
function numberedPinyinToTonedPinyin(numbered)
{
    let parts = numbered.split(" ");
    for(let i = 0; i < parts.length; i++)
    {
        let part = parts[i];
        let tone = parseInt(part.substring(part.length - 1)) - 1;
        if(isNaN(tone))
        {
            continue;
        }
        part = part.substring(0, part.length - 1);
        let vowelInd = getLowestVowel(part);
        part = part.replace(vowels[vowelInd], tonedVowels[tone][vowelInd]);
        parts[i] = part;
    }
    let pinyin = parts[0];
    for(let i = 1; i < parts.length; i++)
    {
        pinyin += parts[i];
    }
    return pinyin;
}
function getLineEnding(text)
{
    let lineEnding = "";
    let foundR = false;
    let foundN = false;
    for(let i = 0; i < text.length; i++)
    {
        let char = text[i];
        if((char == "\r" && !foundR) || (char == "\n" && !foundN))
        {
            lineEnding += char;
            if(char == "\r")
            {
                foundR = true;
            }
            if(char == "\n")
            {
                foundN = true;
            }
        }
        else if(lineEnding.length > 0)
        {
            break;
        }
    }
    return lineEnding;
}
function parseu8File(filename)
{
    let fileString = fs.readFileSync(filename, "utf8");
    let lines = fileString.split(getLineEnding(fileString));
    dict = [];
    for(let i = 0; i < lines.length; i++)
    {
        let line = lines[i];
        if(line[0] == "#" || line.length == 0) continue;
        let parts = parseu8Line(line);
        let chars = parts[1].replace("\ufeff", "");
        let pinyin = parts[2];
        let def = parts[3];
        let dictItem = {
            word: chars,
            pinyin: pinyin,
            definition: def,
            hsk: 0
        };
        dict.push(dictItem);
    }
    return dict;
}
function parseu8Line(line)
{
    function getItem()
    {
        let item = "";
        for(let i = 0; i < line.length; i++)
        {
            let char = line[i];
            if(char == " ")
            {
                break;
            }
            else
            {
                item += char;
            }
        }
        line = line.substring(item.length + 1);
        return item;
    }
    let firstItem = getItem();
    let secondItem = getItem();
    let thirdPos = line.indexOf("[");
    let endThirdPos = line.indexOf("]");
    let thirdItem = line.substring(thirdPos + 1, endThirdPos);
    let fourthPos = line.indexOf("/")
    // fourthEndPos = line.substring(fourthPos + 1).indexOf("/") + fourthPos + 1;
    let fourthEndPos = line.lastIndexOf("/");
    let fourthItem = line.substring(fourthPos + 1, fourthEndPos);
    return [firstItem, secondItem, thirdItem, fourthItem];
}
function parseTsvFile(filename)
{
    let fileString = fs.readFileSync(filename, "utf8");
    let lines = fileString.split("\n");
    let dict = {};
    for(let i = 0; i < lines.length; i++)
    {
        let line = lines[i];
        let parts = line.split("\t");
        let chars = parts[0].replace("\ufeff", "");
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
        socket.emit("set", {
            column: "hsk" + num,
            row: key,
            item: [value]
        });
    }
    //console.log(hskDict);
    console.log("sent hsk " + num);
}
function sendFullDict()
{
    let dict = parseu8File("cedict_ts.u8");
    let count = 0;
    let dictObj = {};
    for(let i = 0; i < dict.length; i++)
    {
        let value = dict[i];
        value.pinyin = numberedPinyinToTonedPinyin(value.pinyin);
        if(dictObj.hasOwnProperty(value.word))
        {
            let dictItem = dictObj[value.word];
            if(Array.isArray(dictItem))
            {
                dictItem.push(value);
            }
            else
            {
                dictObj[value.word] = [dictItem, value];
            }
        }
        else
        {
            dictObj[value.word] = [value];
        }
        count++;
    }
    console.log("loaded full dict");
    for(let key in dictObj)
    {
        let dictItem = dictObj[key];
        socket.emit("set", {
            column: "other",
            row: key,
            item: dictItem,
            hsk: 0
        });
    }
    console.log("sent full dict, " + dict.length + ", " + count);
}
function reset()
{
    socket.emit("reset");
    sendFullDict();
    sendHSK("1");
    sendHSK("2");
    sendHSK("3");
    sendHSK("4");
    sendHSK("5");
    sendHSK("6");
}
function main()
{
    socket = sio("http://127.0.0.1:8000");//new WebSocket("ws://127.0.0.1:5524");
    console.log("connecting");
    socket.on("connect", () => {
        console.log("connected to server");
        reset();
    });
}
main();
