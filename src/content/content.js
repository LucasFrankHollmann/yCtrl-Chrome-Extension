document.addEventListener("DOMContentLoaded", function() {
    createTabList();
});

function getYtTabs(tabs){
    return tabs.filter(x => x.url.includes("www.youtube.com"));
}

function element(tag, id, classname){
    if(tag)
        return document.getElementsByTagName(tag);
    if(id)
        return document.getElementById(id);
    if(classname)
        return document.getElementsByClassName(classname);
}

function runInTabs(callback){
    chrome.tabs.query({}, callback);
}

function createTabList(){
    element(undefined, "mainDiv").replaceChildren("");
    runInTabs((tabs) => {
        let ytTabs = getYtTabs(tabs);

        for(let ytTab of ytTabs){
            createTabItem(ytTab);
        }
    });
}

function createTabItem(tab){
    let tabDiv = document.createElement("div");
    tabDiv.classList.add("tabDiv");
    let playImg = document.createElement("img");
    playImg.classList.add("playImg");
    let controlsDiv = document.createElement("div");
    controlsDiv.classList.add("controlsDiv");
    let titleDiv = document.createElement("div");
    titleDiv.classList.add("titleDiv");
    let titleSpan = document.createElement("span");
    let closeSpan = document.createElement("div");
    closeSpan.classList.add("closeSpan");
    closeSpan.textContent = "X";
    let buttonsDiv = document.createElement("div");
    buttonsDiv.classList.add("buttonsDiv");
    let nextImg = document.createElement("img");
    let prevImg = document.createElement("img");
    let goBackImg = document.createElement("img");
    let goForthImg = document.createElement("img");
    let timeSpan = document.createElement("span");
    nextImg.src = "forward-step-solid-full.svg"
    prevImg.src = "forward-step-solid-full.svg"
    goBackImg.src = "forward-solid-full.svg"
    goForthImg.src = "forward-solid-full.svg"
    playImg.src = "play-solid-full.svg";
    buttonsDiv.appendChild(prevImg);
    buttonsDiv.appendChild(goBackImg);
    buttonsDiv.appendChild(playImg);
    buttonsDiv.appendChild(goForthImg);
    buttonsDiv.appendChild(nextImg);
    buttonsDiv.appendChild(timeSpan);
    buttonsDiv.appendChild(closeSpan);
    prevImg.style.transform = "rotate(180deg)";
    goBackImg.style.transform = "rotate(180deg)";
    let timelineDiv = document.createElement("div");
    let timelineSlider = document.createElement("input");
    timelineSlider.type = "range";
    timelineDiv.appendChild(timelineSlider);
    timelineDiv.classList.add("timelineDiv");
    
    
    tabDiv.appendChild(controlsDiv);
    controlsDiv.appendChild(titleDiv);
    controlsDiv.appendChild(buttonsDiv);
    controlsDiv.appendChild(timelineDiv);
    titleDiv.appendChild(titleSpan);
    titleSpan.textContent = tab.title;
    element(undefined, "mainDiv").appendChild(tabDiv);
    
    playImg.addEventListener("click", (e) => {play(e, tab)});
    prevImg.addEventListener("click", (e) => {prev(e, tab)});
    nextImg.addEventListener("click", (e) => {next(e, tab)});
    goBackImg.addEventListener("click", (e) => {goBack(e, tab, timelineSlider, timeSpan, playImg)});
    goForthImg.addEventListener("click", (e) => {goForth(e, tab, timelineSlider, timeSpan, playImg)});
    closeSpan.addEventListener("click", (e) => {close(e, tab)});
    timelineSlider.addEventListener("change", (e) => {changeSlider(e, tab, timeSpan)});

    setSliderValues(tab, timelineSlider, timeSpan, playImg, titleSpan);
    setInterval(() => setSliderValues(tab, timelineSlider, timeSpan, playImg, titleSpan), 1000);
}

function setSliderValues(tab, timelineSlider, timeSpan, playImg, titleSpan){
    runScript(tab, 
        () => {
            const videos = document.getElementsByTagName("video");
            return Array.from(videos).map(v => ({
                duration: v.duration ?? 0,
                curTime: v.currentTime,
                paused: v.paused
            }));
        },
        (result) => {
            if(result[0].duration && result[0].duration > 0)
                timelineSlider.max = result[0].duration;
            else
                timelineSlider.max = 0;

            if(result[0].curTime && result[0].curTime > 0)
                timelineSlider.value = result[0].curTime;
            else
                timelineSlider.value = 0;
            setTimeSpan(timelineSlider, timeSpan);
            playImg.src = result[0].paused ? "play-solid-full.svg" : "pause-solid-full.svg";
        });
    if(titleSpan)
        titleSpan.textContent = tab.title;
}

function play(e, tab){
    runScript(tab, 
        () => {
            const video = document.getElementsByTagName("video")[0];
            video.paused ? video.play() : video.pause();

            return video.paused;
        },
        (paused) => {
            e.target.src = paused ? "play-solid-full.svg" : "pause-solid-full.svg";
        });
}

function prev(e, tab){
    runScript(tab, 
        () => {
            document.querySelector(".ytp-prev-button").click();
        },
        () => {});
}

function next(e, tab){
    runScript(tab, 
        () => {
            document.querySelector(".ytp-next-button").click();
        },
        () => {});
}

function goBack(e, tab, timelineSlider, timeSpan, playImg){
    runScript(tab, 
        () => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime -= 15;
        },
        () => {});
    setSliderValues(tab, timelineSlider, timeSpan, playImg);
}

function goForth(e, tab, timelineSlider, timeSpan, playImg){
    runScript(tab, 
        () => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime += 15;
        },
        () => {});
    setSliderValues(tab, timelineSlider, timeSpan, playImg);
}

function close(e, tab){
    chrome.tabs.remove(tab.id);
}

function changeSlider(e, tab, timeSpan){
    runScript(tab, 
        (val) => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime = val;
        },
        (result) => {}, [e.target.value]);

    setTimeSpan(e.target, timeSpan);
}

function setTimeSpan(timeLine, timeSpan){
    let max = timeLine.max;
    let val = timeLine.value;
    timeSpan.textContent = max == 0 ? "0%" :parseInt((val/max)*100) + "%";
}

function runScript(tab, gather, consume, argus){
    chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: gather,
            args: argus
        },
        (results) => {
            consume(results[0].result);
        }
    );
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if(changeInfo.title)
        createTabList();
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  createTabList();
});