var socket;
var accountName = "";
var userInputBox, saveNameInputBox, saveListDiv, defWordInput, defPinyinInput, defDefInput, lookupCharInp, lookupPinyinInp;
var saveNameList = {};
var wordDict = {}, personalDict = {};
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
var vowels = ["iu", "a", "e", "i", "o", "u", "ü"];
var tonedVowels = [
    ["iū", "ā", "ē", "ī", "ō", "ū", "ǘ"],
    ["iú", "á", "é", "í", "ó", "ú", "ǘ"],
    ["iǔ", "ǎ", "ě", "ǐ", "ǒ", "ǔ", "ǚ"],
    ["iù", "à", "è", "ì​", "ò", "ù", "ǜ"],
    ["iu", "a", "e", "i", "o", "u", "ü"]
];
var uuwo = ["ū:", "ú:", "ǔ:", "ù:", "u:", "v"];
var uuw = ["ǘ", "ǘ", "ǚ", "ǜ", "ü", "ü"]
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
        for(let j = 0; j < uuwo.length; j++)
        {
            part = part.replace(new RegExp(uuwo[j], "g"), uuw[j]);
        }
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
    userInputBox.value = text;
    let outputTextElem = document.getElementById("outputText");
    outputTextElem.innerHTML = "";
    let lineEnding = getLineEnding(text);
    let lines = text.split(lineEnding);
    for(let i = 0; i < lines.length; i++)
    {
        let line = lines[i];
        console.log("line " + (i + 1) + ": " + line);
        let lineElem = document.createElement("div");
        //find all of the words
        let lastWordDiv = null;
        let lastWordIsDef = false;
        while(line.length > 0)
        {
            word = "";
            function findWord(useDict) //todo optimize this
            {
                for(let key in useDict)
                {
                    if(line.substring(0, key.length) == key)
                    {
                        if(key.length > word.length)
                        {
                            word = key;
                        }
                    }
                }
            }
            findWord(wordDict);
            findWord(personalDict);
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
                let foundWord = wordDict[word];
                if(typeof foundWord == "undefined")
                {
                    foundWord = personalDict[word];
                }
                pinyintext.innerHTML = foundWord[foundWord.length - 1].pinyin;
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
    let wordList = wordDict[word];
    if(typeof wordList === "undefined")
    {
        wordList = personalDict[word];
    }
    if(typeof wordList === "undefined")
    {
        return;
    }
    let dictBox = document.getElementById("dictBox");
    dictBox.setAttribute("style", "display:block;");
    let dictBoxContent = document.getElementById("dictBoxContent");
    dictBoxContent.innerHTML = "";
    for(let i = 0; i < wordList.length; i++)
    {
        let wordObj = wordList[i];
        if(typeof wordObj !== "undefined")
        {
            let dictElem = document.createElement("div");
            let dictWordElem = document.createElement("div");
            let dictWordTextElem = document.createElement("p");
            dictWordTextElem.innerHTML = "Word: " + word;
            dictWordElem.appendChild(dictWordTextElem);
            let dictPinyinElem = document.createElement("div");
            let dictPinyinTextElem = document.createElement("p");
            dictPinyinTextElem.innerHTML = "Pinyin: " + wordObj.pinyin;
            dictPinyinElem.appendChild(dictPinyinTextElem);
            let dictDefElem = document.createElement("div");
            let dictDefTextElem = document.createElement("p");
            dictDefTextElem.innerHTML = "Definition: " + wordObj.definition;
            dictDefElem.appendChild(dictDefTextElem);
            let dictHskElem = document.createElement("div");
            let dictHskTextElem = document.createElement("p");
            dictHskTextElem.innerHTML = "HSK: " + wordList.hsk;
            dictHskElem.appendChild(dictHskTextElem);
            dictElem.appendChild(dictWordElem);
            dictElem.appendChild(dictPinyinElem);
            dictElem.appendChild(dictDefElem);
            dictElem.appendChild(dictHskElem);
            dictBoxContent.appendChild(dictElem);
        }
    }
}
function loadSaves()
{
    if(accountName == "") return;
    console.log("requesting saves");
    socket.emit("request", {
        username: accountName,
        column: "saves"
    });
}
function clearLocalSaves()
{
    saveNameList = {};
    saveListDiv.innerHTML = "<p>Saved texts</p><p id=\"loadingOutput\"></p>";
}
window.addEventListener("load", () => {
    socket = io();
    socket.on("column", (dataObj) => {
        console.log("got data for column " + dataObj.name);
        let isPersonal = false;
        if(accountName != "" && dataObj.name.substring(0, accountName.length) == accountName)
        {
            dataObj.name = dataObj.name.substring(accountName.length + 1);
            isPersonal = true;
            console.log("column is personal: " + dataObj.name);
        }
        if(dataObj.name == "saves")
        {
            clearLocalSaves();
            for(let key in dataObj.column)
            {
                addSaveToList(key, dataObj.column[key]);
            }
        }
        else if(dataObj.name.substring(0, 3) == "hsk" || dataObj.name == "other")
        {
            let hskVal = parseInt(dataObj.name.substring(3));
            if(isNaN(hskVal) || hskVal == 0)
            {
                hskVal = "none";
            }
            //console.log("got data for " + dataObj.name);
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
            if(typeof len == "undefined")
            {
                len = -1;
            }
            let i = 0;
            let useDict;
            if(isPersonal)
            {
                useDict = personalDict;
            }
            else
            {
                useDict = wordDict;
            }
            for(let key in dataObj.column)
            {
                let item = dataObj.column[key];
                if(useDict.hasOwnProperty(key))
                {
                    useDict[key].push(...item);
                    if(useDict[key].hsk < hskVal || typeof useDict[key].hsk !== "number")
                    {
                        useDict[key].hsk = hskVal;
                    }
                }
                else
                {
                    item.hsk = hskVal;
                    useDict[key] = item;
                }
                i++;
                if(len != -1)
                {
                    if(i > len * (currentPos / maxPos))
                    {
                        currentPos++;
                        console.log(((currentPos / maxPos) * 100) + "%");
                    }
                }
            }
            if(!isPersonal && dataObj.name == "other")
            {
                for(let i = 1; i <= 6; i++)
                {
                    socket.emit("request", {
                        column: "hsk" + i
                    });
                }
            }
        }
    });
    socket.on("connect", () => {
        wordDict = {};
        socket.emit("request", {
            column: "other"
        });
    });
    userInputBox = document.getElementById("userInput");
    saveNameInputBox = document.getElementById("saveNameInput");
    saveListDiv = document.getElementById("saveList");
    let submitButton = document.getElementById("textSubmitButton");
    submitButton.addEventListener("click", () => {
        let name = saveNameInputBox.value;
        let text = userInputBox.value;
        socket.emit("set", {
            username: accountName,
            column: "saves",
            row: name,
            item: text
        });
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
        if(personalDict.hasOwnProperty(word))
        {
            personalDict[word].push(defObj);
        }
        else
        {
            personalDict[word] = [defObj];
        }
        if(accountName != "")
        {
            socket.emit("set", {
                username: accountName,
                column: "other",
                row: word,
                item: personalDict[word]
            });
        }
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
        function findInDict(useDict)
        {
            for(let key in useDict)
            {
                let wordList = useDict[key];
                for(let i = 0; i < wordList.length; i++)
                {
                    let wordData = wordList[i];
                    if(wordData.pinyin == pinyin)
                    {
                        results.push(wordData);
                    }
                }
            }
        }
        findInDict(wordDict);
        findInDict(personalDict);
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
    document.getElementById("setAccountButton").addEventListener("click", () => { //todo sanitize
        let username = document.getElementById("inputAccountName").value;
        let nameOutput = document.getElementById("accountNameOutput");
        if(username == "")
        {
            return console.log("bad username");
        }
        accountName = username;
        nameOutput.innerHTML = username;
        loadSaves();
        personalDict = {};
        socket.emit("request", {
            username: accountName,
            column: "other"
        });
    });
});
