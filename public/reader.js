var socket;
var userInputBox, saveNameInputBox, saveListDiv, defWordInput, defPinyinInput, defDefInput;
var saveNameList = {};
var wordDict = {};
function addSaveToList(name, text)
{
    if(saveNameList.hasOwnProperty(name))
    {
        saveNameList[name] = text;
        return;
    }
    let textElem = document.createElement("p");
    textElem.innerHTML = name;
    textElem.addEventListener("click", () => {
        loadText(text);
    });
    let elem = document.createElement("div");
    elem.appendChild(textElem);
    saveListDiv.appendChild(elem);
    saveNameList[name] = text;
}
function loadText(text)
{
    let outputTextElem = document.getElementById("outputText");
    outputTextElem.innerHTML = "";
    let lines = text.split("\n\r");
    for(let i = 0; i < lines.length; i++)
    {
        let line = lines[i];
        //find all of the words
        while(line.length > 0)
        {
            //todo optimize this
            word = "";
            for(let key in wordDict)
            {
                if(line.substring(0, key.length) == key)
                {
                    if(key.length > word.length)
                    {
                        word = key;
                    }
                }
            }
            let wordDiv = document.createElement("div");
            wordDiv.setAttribute("style", "display:inline-block;margin-right:1em;")
            let zitext = document.createElement("p");
            zitext.setAttribute("style", "text-align:center;font-size:24px;");
            let pinyintext = document.createElement("p");
            pinyintext.setAttribute("style", "text-align:center;font-size:18px;");
            wordDiv.appendChild(zitext);
            wordDiv.appendChild(pinyintext);
            outputTextElem.appendChild(wordDiv);
            if(word.length == 0)
            {
                word = line[0];
                zitext.innerHTML = word;
                pinyintext.innerHTML = word;
            }
            else
            {
                wordDiv.addEventListener("click", (function(w) {
                    return function() {
                        setDictionaryPage(w);
                    };
                })(word));
                zitext.innerHTML = word;
                pinyintext.innerHTML = wordDict[word].pinyin;
            }
            line = line.substring(word.length);
        }
        outputTextElem.appendChild(document.createElement("br"));
    }

}
function setDictionaryPage(word)
{
    let wordObj = wordDict[word];
    document.getElementById("dictWord").innerHTML = "Word: " + word;
    document.getElementById("dictPinyin").innerHTML = "Pinyin: " + wordObj.pinyin;
    document.getElementById("dictDefinition").innerHTML = "Definition: " + wordObj.definition;
    document.getElementById("dictHsk").innerHTML = "HSK: " + wordObj.hsk;
}
window.addEventListener("load", () => {
    socket = new WebSocket("ws://127.0.0.1:5524");
    socket.onmessage = (ev) => {
        var dataObj = JSON.parse(ev.data);
        switch(dataObj.type)
        {
            case "column":
                if(dataObj.name == "saves")
                {
                    for(let key in dataObj.column)
                    {
                        addSaveToList(key, dataObj.column[key]);
                    }
                }
                else if(dataObj.name.substring(0, 3) == "hsk" || dataObj.name == "other")
                {
                    let hskVal = parseInt(dataObj.name.substring(3));
                    if(isNaN(hskVal))
                    {
                        hskVal = "none";
                    }
                    console.log("got data for " + dataObj.name);
                    let currentPos = 0;
                    let maxPos = 4;
                    let len = {
                        hsk1: 150,
                        hsk2: 151,
                        hsk3: 300,
                        hsk4: 600,
                        hsk5: 1300,
                        hsk6: 2500,
                        other: 117588-31
                    }[dataObj.name];
                    let i = 0;
                    for(let key in dataObj.column)
                    {
                        let item = dataObj.column[key];
                        item.hsk = hskVal;
                        wordDict[key] = item;
                        i++;
                        if(i > len * (currentPos / maxPos))
                        {
                            currentPos++;
                            console.log(((currentPos / maxPos) * 100) + "%");
                        }
                    }
                    if(dataObj.name == "other")
                    {
                        for(let i = 1; i <= 6; i++)
                        {
                            socket.send(JSON.stringify({
                                type: "request",
                                column: "hsk" + i
                            }));
                        }
                    }
                }
                break;
        }
    };
    socket.onopen = (ev) => {
        socket.send(JSON.stringify({
            type: "request",
            column: "other"
        }));
        socket.send(JSON.stringify({
            type: "request",
            column: "saves"
        }));
    };
    userInputBox = document.getElementById("userInput");
    saveNameInputBox = document.getElementById("saveNameInput");
    saveListDiv = document.getElementById("saveList");
    let submitButton = document.getElementById("textSubmitButton");
    submitButton.addEventListener("click", () => {
        let name = saveNameInputBox.value;
        let text = userInputBox.value;
        socket.send(JSON.stringify({
            type: "set",
            column: "saves",
            row: name,
            item: text
        }));
        addSaveToList(name, text);
    });
    defWordInput = document.getElementById("inputDefName");
    defPinyinInput = document.getElementById("inputDefPinyin");
    defDefInput = document.getElementById("inputDefDefinition");
    let submitDefinitionButton = document.getElementById("inputDefButton");
    submitDefinitionButton.addEventListener("click", () => {
        let word = defWordInput.value;
        let pinyin = defPinyinInput.value;
        let definition = defDefInput.value;
        let defObj = {
            word: word,
            pinyin: pinyin,
            definition: definition,
            hsk: 0
        };
        wordDict[word] = defObj;
        socket.send(JSON.stringify({
            type: "set",
            column: "other",
            row: word,
            item: defObj
        }));
    });
});