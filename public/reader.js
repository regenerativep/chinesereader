var socket;
var userInputBox, saveNameInputBox, saveListDiv, defWordInput, defPinyinInput, defDefInput, lookupCharInp, lookupPinyinInp;
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
    let elem = document.createElement("div");
    elem.addEventListener("click", () => {
        updateLoading("Loading");
        window.setTimeout(() => {
            loadText(text);
        }, 16);
    });
    elem.appendChild(textElem);
    saveListDiv.appendChild(elem);
    saveNameList[name] = text;
}
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
var loadingElement = null;
function updateLoading(percent)
{
    if(loadingElement == null)
    {
        loadingElement = document.getElementById("loadingOutput");
    }
    if(percent == null)
    {
        loadingElement.innerHTML = "";
    }
    else if(typeof percent === "string")
    {
        loadingElement.innerHTML = "(" + percent + ")";
    }
    else if(typeof percent === "number")
    {
        loadingElement.innerHTML = "(Loading: " + Math.floor(percent * 100) + "%)";
    }
}function getLineEnding(text)
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
    if(lineEnding.length == 0)
    {
        lineEnding = "\n";
    }
    return lineEnding;
}
function loadText(text)
{
    let outputTextElem = document.getElementById("outputText");
    outputTextElem.innerHTML = "";
    let lineEnding = getLineEnding(text);
    console.log({e:lineEnding})
    console.log({e:text});
    let lines = text.split(lineEnding);
    console.log(lines);
    for(let i = 0; i < lines.length; i++)
    {
        let line = lines[i];
        console.log({i:i,e:line})
        let lineElem = document.createElement("div");
        //find all of the words
        let lastWordDiv = null;
        let lastWordIsDef = false;
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
            wordDiv.setAttribute("class", "word")
            let zitext = document.createElement("p");
            zitext.setAttribute("class", "wordChar");
            let pinyintext = document.createElement("p");
            pinyintext.setAttribute("class", "wordPinyin");
            wordDiv.appendChild(zitext);
            wordDiv.appendChild(pinyintext);
            if(word.length == 0)
            {
                word = line[0];
                if(lastWordIsDef || lastWordDiv == null)
                {
                    zitext.innerHTML = word;
                    pinyintext.innerHTML = word;
                    lineElem.appendChild(wordDiv);
                }
                else
                {
                    wordDiv = lastWordDiv;
                    zitext = wordDiv.children[0];
                    pinyintext = wordDiv.children[1];
                    zitext.innerHTML += word;
                    pinyintext.innerHTML += word;
                }
                lastWordIsDef = false;
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
                lastWordIsDef = true;
                lineElem.appendChild(wordDiv);
            }
            line = line.substring(word.length);
            lastWordDiv = wordDiv;
        }
        outputTextElem.appendChild(lineElem);
    }
    updateLoading(null);
}
function setDictionaryPage(word)
{
    let wordObj = wordDict[word];
    if(typeof wordObj !== "undefined")
    {
        document.getElementById("dictBox").setAttribute("style", "display:block;");
        document.getElementById("dictWord").innerHTML = "Word: " + word;
        document.getElementById("dictPinyin").innerHTML = "Pinyin: " + wordObj.pinyin;
        document.getElementById("dictDefinition").innerHTML = "Definition: " + wordObj.definition;
        document.getElementById("dictHsk").innerHTML = "HSK: " + wordObj.hsk;
    }
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
    let textLoadButton = document.getElementById("textLoadButton");
    textLoadButton.addEventListener("click", () => {
        let text = userInputBox.value;
        loadText(text);
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
    lookupCharInp = document.getElementById("inputLookupCharacters");
    lookupPinyinInp = document.getElementById("inputLookupPinyin");
    document.getElementById("inputLookupCharactersButton").addEventListener("click", () => {
        let inp = lookupCharInp.value;
        setDictionaryPage(inp);
    });
    document.getElementById("inputLookupPinyinButton").addEventListener("click", () => {
        let inp = lookupPinyinInp.value;
        //turn it into toned pinyin
        let pinyin = numberedPinyinToTonedPinyin(inp);
        //find the corresponding dict values
        let results = [];
        for(let word in wordDict)
        {
            let wordData = wordDict[word];
            if(wordData.pinyin == pinyin)
            {
                results.push(wordData);
            }
        }
        //output them to the user
        let outputElem = document.getElementById("pinyinLookupResults");
        outputElem.innerHTML = "";
        for(let i = 0; i < results.length; i++)
        {
            let wordData = results[i];
            outputElem.innerHTML += wordData.word + ": " + wordData.definition + "<br>";
        }
    });
    document.getElementById("dictBoxCloseButton").addEventListener("click", () => {
        document.getElementById("dictBox").setAttribute("style", "display:none;");
    });
});
