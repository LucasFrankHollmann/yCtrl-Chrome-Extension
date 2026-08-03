import runScript from '../lib/runScript';

document.addEventListener("DOMContentLoaded", function() {
    createTabList();
});

function getYtTabs(tabs: chrome.tabs.Tab[]){
    return tabs.filter(x => x.url?.includes("www.youtube.com"));
}

function element(tag?: string, id?: string, classname?: string){
    if(tag)
        return document.getElementsByTagName(tag);
    if(id)
        return document.getElementById(id);
    if(classname)
        return document.getElementsByClassName(classname);
}

function runInTabs(callback: (tabs: chrome.tabs.Tab[]) => void){
    chrome.tabs.query({}, callback);
}

function mainDiv(){
    return element(undefined, "mainDiv") as HTMLElement;
}

function createTabList(){
    mainDiv().replaceChildren("");
    runInTabs((tabs) => {
        const ytTabs = getYtTabs(tabs);

        for(const ytTab of ytTabs){
            createTabItem(ytTab);
        }
    });
}

function createTabItem(tab: chrome.tabs.Tab){
    const tabDiv = document.createElement("div");
    tabDiv.classList.add("tabDiv");
    const playImg = document.createElement("img");
    playImg.classList.add("playImg");
    const controlsDiv = document.createElement("div");
    controlsDiv.classList.add("controlsDiv");
    const titleDiv = document.createElement("div");
    titleDiv.classList.add("titleDiv");
    const titleSpan = document.createElement("span");
    const closeSpan = document.createElement("div");
    closeSpan.classList.add("closeSpan");
    closeSpan.textContent = "X";
    const buttonsDiv = document.createElement("div");
    buttonsDiv.classList.add("buttonsDiv");
    const nextImg = document.createElement("img");
    const prevImg = document.createElement("img");
    const goBackImg = document.createElement("img");
    const goForthImg = document.createElement("img");
    const timeSpan = document.createElement("span");
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
    const timelineDiv = document.createElement("div");
    const timelineSlider = document.createElement("input");
    timelineSlider.type = "range";
    timelineDiv.appendChild(timelineSlider);
    timelineDiv.classList.add("timelineDiv");


    tabDiv.appendChild(controlsDiv);
    controlsDiv.appendChild(titleDiv);
    controlsDiv.appendChild(buttonsDiv);
    controlsDiv.appendChild(timelineDiv);
    titleDiv.appendChild(titleSpan);
    titleSpan.textContent = tab.title ?? "";
    mainDiv().appendChild(tabDiv);

    playImg.addEventListener("click", (e) => {play(e, tab)});
    prevImg.addEventListener("click", () => {prev(tab)});
    nextImg.addEventListener("click", () => {next(tab)});
    goBackImg.addEventListener("click", () => {goBack(tab, timelineSlider, timeSpan, playImg)});
    goForthImg.addEventListener("click", () => {goForth(tab, timelineSlider, timeSpan, playImg)});
    closeSpan.addEventListener("click", () => {close(tab)});
    timelineSlider.addEventListener("change", (e) => {changeSlider(e, tab, timeSpan)});

    setSliderValues(tab, timelineSlider, timeSpan, playImg, titleSpan);
    setInterval(() => setSliderValues(tab, timelineSlider, timeSpan, playImg, titleSpan), 1000);
}

function setSliderValues(tab: chrome.tabs.Tab, timelineSlider: HTMLInputElement, timeSpan: HTMLElement, playImg: HTMLImageElement, titleSpan?: HTMLElement){
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
                timelineSlider.max = String(result[0].duration);
            else
                timelineSlider.max = "0";

            if(result[0].curTime && result[0].curTime > 0)
                timelineSlider.value = String(result[0].curTime);
            else
                timelineSlider.value = "0";
            setTimeSpan(timelineSlider, timeSpan);
            playImg.src = result[0].paused ? "play-solid-full.svg" : "pause-solid-full.svg";
        });
    if(titleSpan)
        titleSpan.textContent = tab.title ?? "";
}

function play(e: MouseEvent, tab: chrome.tabs.Tab){
    runScript(tab,
        () => {
            const video = document.getElementsByTagName("video")[0];
            if(video.paused)
                video.play();
            else
                video.pause();

            return video.paused;
        },
        (paused) => {
            (e.target as HTMLImageElement).src = paused ? "play-solid-full.svg" : "pause-solid-full.svg";
        });
}

function prev(tab: chrome.tabs.Tab){
    runScript(tab,
        () => {
            document.querySelector<HTMLElement>(".ytp-prev-button")?.click();
        },
        () => {});
}

function next(tab: chrome.tabs.Tab){
    runScript(tab,
        () => {
            document.querySelector<HTMLElement>(".ytp-next-button")?.click();
        },
        () => {});
}

function goBack(tab: chrome.tabs.Tab, timelineSlider: HTMLInputElement, timeSpan: HTMLElement, playImg: HTMLImageElement){
    runScript(tab,
        () => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime -= 15;
        },
        () => {});
    setSliderValues(tab, timelineSlider, timeSpan, playImg);
}

function goForth(tab: chrome.tabs.Tab, timelineSlider: HTMLInputElement, timeSpan: HTMLElement, playImg: HTMLImageElement){
    runScript(tab,
        () => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime += 15;
        },
        () => {});
    setSliderValues(tab, timelineSlider, timeSpan, playImg);
}

function close(tab: chrome.tabs.Tab){
    if(tab.id !== undefined)
        chrome.tabs.remove(tab.id);
}

function changeSlider(e: Event, tab: chrome.tabs.Tab, timeSpan: HTMLElement){
    const slider = e.target as HTMLInputElement;
    runScript(tab,
        (val: number) => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime = val;
        },
        () => {}, [Number(slider.value)]);

    setTimeSpan(slider, timeSpan);
}

function setTimeSpan(timeLine: HTMLInputElement, timeSpan: HTMLElement){
    const max = Number(timeLine.max);
    const val = Number(timeLine.value);
    timeSpan.textContent = max == 0 ? "0%" : parseInt(String((val/max)*100)) + "%";
}

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    console.log(tab.title)
    if(changeInfo.title)
        createTabList();
});

chrome.tabs.onRemoved.addListener(() => {
  createTabList();
});
