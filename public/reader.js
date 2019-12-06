var socket;
var accountName = "", showPinyin = true;
var userInputBox, saveNameInputBox, saveListDiv,
    defWordInput, defPinyinInput, defDefInput, lookupCharInp,
    lookupPinyinInp, dictBoxCloseButton, setAccountButton,
    inputLookupCharactersButton, inputLookupPinyinButton,
    textSubmitButton, textLoadButton, submitDefinitionButton,
    dictBox, inputAccountName, accountNameOutput,
    outputTextElem, dictBoxContent;
var lines, lineEnding, lineInd;
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
    if(lineEnding.length == 0)
    {
        lineEnding = "\n";
    }
    return lineEnding;
}
var longestWordLength;
function findLongestWordLength(dict)
{
    let longestLength = 0;
    for(let key in dict)
    {
        if(key.length > longestLength)
        {
            longestLength = key.length;
        }
    }
    return longestLength;
}
function loadText(text)
{
    updateLoading("Loading");
    userInputBox.value = text;
    outputTextElem.innerHTML = "";
    lineEnding = getLineEnding(text);
    lines = text.split(lineEnding);
    lineInd = 0;
    longestWordLength = Math.max(findLongestWordLength(wordDict), findLongestWordLength(personalDict));
    function runLine()
    {
        let line = lines[0];
        lines.splice(0, 1);
        lineInd++;
        console.log("line " + (lineInd + 1) + ": " + line);
        let lineElem = document.createElement("div");
        //find all of the words
        let lastWordDiv = null;
        let lastWordIsDef = false;
        while(line.length > 0)
        {
            word = "";
            function findWord(useDict)
            {
                for(let i = Math.min(longestWordLength, line.length); i > 0; i--)
                {
                    let testWord = line.substring(0, i);
                    if(typeof useDict[testWord] !== "undefined" && testWord.length > word.length)
                    {
                        word = testWord;
                        return;
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
            pinyintext.setAttribute("style", getPinyinStyle(showPinyin));
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
                pinyintext.innerHTML = foundWord[foundWord.length - 1].pinyin.split(",")[0];
                lastWordIsDef = true;
                lineElem.appendChild(wordDiv);
            }
            line = line.substring(word.length);
            lastWordDiv = wordDiv;
        }
        outputTextElem.appendChild(lineElem);
        if(lines.length > 0)
        {
            window.setTimeout(() => { runLine(); }, 0);
        }
        else
        {
            updateLoading(null);
        }
    }
    runLine();
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
    loadDictionaryPageFromWordList(wordList);
}
function setShowPinyin(show)
{
    let pinyinElements = document.getElementsByClassName("wordPinyin");
    let style = getPinyinStyle(show);
    for(let i = 0; i < pinyinElements.length; i++)
    {
        pinyinElements[i].style = style;
    }
}
function getPinyinStyle(show)
{
    return "display: " + (show ? "block" : "none") + ";";
}
function loadDictionaryPageFromWordList(wordList)
{
    dictBox.setAttribute("style", "display:block;");
    dictBoxContent.innerHTML = "";
    for(let i = 0; i < wordList.length; i++)
    {
        let wordObj = wordList[i];
        if(typeof wordObj !== "undefined")
        {
            let dictElem = document.createElement("div");
            let dictWordElem = document.createElement("div");
            let dictWordTextElem = document.createElement("p");
            dictWordTextElem.innerHTML = "Word: " + wordObj.word;
            dictWordElem.appendChild(dictWordTextElem);
            let dictPinyinElem = document.createElement("div");
            let dictPinyinTextElem = document.createElement("p");
            dictPinyinTextElem.innerHTML = "Pinyin: " + wordObj.pinyin;
            dictPinyinElem.appendChild(dictPinyinTextElem);
            let dictDefElem = document.createElement("div");
            let dictDefTextElem = document.createElement("p");
            dictDefTextElem.innerHTML = "Definition: " + wordObj.definition;
            dictDefElem.appendChild(dictDefTextElem);
            dictDefElem.style = "margin-left: 1em;";
            dictElem.appendChild(dictWordElem);
            dictElem.appendChild(dictPinyinElem);
            if(typeof wordList.hsk !== "undefined")
            {
                let dictHskElem = document.createElement("div");
                let dictHskTextElem = document.createElement("p");
                dictHskTextElem.innerHTML = "HSK: " + wordList.hsk;
                dictHskElem.appendChild(dictHskTextElem);
                dictElem.appendChild(dictHskElem);
            }
            dictElem.appendChild(dictDefElem);
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
    saveListDiv.innerHTML = "<p class=\"sectitle\">Saved texts</p><p class=\"subtitle\" id=\"loadingOutput\"></p>";
}
function loadDomReferences()
{
    userInputBox = document.getElementById("userInput");
    saveNameInputBox = document.getElementById("saveNameInput");
    saveListDiv = document.getElementById("saveList");
    defWordInput = document.getElementById("inputDefName");
    defPinyinInput = document.getElementById("inputDefPinyin");
    defDefInput = document.getElementById("inputDefDefinition");
    lookupCharInp = document.getElementById("inputLookupCharacters");
    lookupPinyinInp = document.getElementById("inputLookupPinyin");
    inputLookupCharactersButton = document.getElementById("inputLookupCharactersButton");
    inputLookupPinyinButton = document.getElementById("inputLookupPinyinButton");
    dictBoxCloseButton = document.getElementById("dictBoxCloseButton");
    setAccountButton = document.getElementById("setAccountButton");
    textSubmitButton = document.getElementById("textSubmitButton");
    textLoadButton = document.getElementById("textLoadButton");
    submitDefinitionButton = document.getElementById("inputDefButton");
    dictBox = document.getElementById("dictBox");
    inputAccountName = document.getElementById("inputAccountName");
    accountNameOutput = document.getElementById("accountNameOutput");
    outputTextElem = document.getElementById("outputText");
    dictBoxContent = document.getElementById("dictBoxContent");
    showPinyinCheckbox = document.getElementById("showPinyinCheckbox");
}
function onColumn(dataObj)
{
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
                if(i >= len * (currentPos / maxPos))
                {
                    currentPos++;
                    console.log(i + " / " + len);
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
}
function beginConnect()
{
    socket = io();
    socket.on("column", (dataObj) => { onColumn(dataObj); });
    socket.on("connect", () => {
        wordDict = {};
        socket.emit("request", {
            column: "other"
        });
    });
}
function findFromPinyin(pinyin)
{
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
    return results;
}
function loginAs(username)
{
    if(username == "")
    {
        return console.log("bad username");
    }
    accountName = username;
    accountNameOutput.innerHTML = username;
    loadSaves();
    personalDict = {};
    socket.emit("request", {
        username: accountName,
        column: "other"
    });
}
function makeEnterButtonPair(textbox, button)
{
    textbox.addEventListener("keyup", ((button) => { return (event) => {
        if(event.key !== "Enter") return;
        button.click();
        event.preventDefault();
    }; })(button));
}
window.addEventListener("load", () => {
    loadDomReferences();
    beginConnect();
    textSubmitButton.addEventListener("click", () => {
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
    textLoadButton.addEventListener("click", () => {
        let text = userInputBox.value;
        loadText(text);
    });
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
    inputLookupCharactersButton.addEventListener("click", () => {
        let inp = lookupCharInp.value;
        setDictionaryPage(inp);
    });
    inputLookupPinyinButton.addEventListener("click", () => {
        let inp = lookupPinyinInp.value;
        let pinyin = numberedPinyinToTonedPinyin(inp);
        let results = findFromPinyin(pinyin);
        loadDictionaryPageFromWordList(results);
    });
    dictBoxCloseButton.addEventListener("click", () => {
        dictBox.setAttribute("style", "display:none;");
    });
    setAccountButton.addEventListener("click", () => { //todo sanitize
        let username = inputAccountName.value;
        loginAs(username);
    });
    showPinyinCheckbox.addEventListener("click", () => {
        showPinyin = showPinyinCheckbox.checked;
        setShowPinyin(showPinyin);
    });
    makeEnterButtonPair(inputAccountName, setAccountButton);
    makeEnterButtonPair(saveNameInputBox, textSubmitButton);
    makeEnterButtonPair(lookupCharInp, inputLookupCharactersButton);
    makeEnterButtonPair(lookupPinyinInp, inputLookupPinyinButton);
});
