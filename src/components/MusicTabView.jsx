import React, { useState, useEffect, useRef } from 'react';
import '../styles/TabView.css'
import ForwardIcon from '../assets/forward-solid-full.svg';
import ForwardStepIcon from '../assets/forward-step-solid-full.svg';
import PauseIcon from '../assets/pause-solid-full.svg';
import PlayIcon from '../assets/play-solid-full.svg';

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

function formatTime(time){
    const hours = parseInt(time/3600);
    const minutes = parseInt(time/60 - hours*60);
    const seconds = parseInt(time - hours*3600 - minutes*60);

    const returnSeconds = seconds < 10 ? '0' + seconds : '' + seconds;
    const returnMinutes = (minutes < 10 ? '0' + minutes : '' + minutes) + ':';
    const returnHours = hours > 0 ? hours + ':': '';

    return returnHours + returnMinutes + returnSeconds;
}

export default function TabView({ tab }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isShowingPreview, setIsShowingPreview] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [maxTime, setMaxTime] = useState(0);
    const [title, setTitle] = useState("");
    const [visible, setVisible] = useState(true);
    const [previewInterval, setPreviewInterval] = useState(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        setTitle(tab.title);
        setTimeInfo();
        setInterval(() => {
            setTimeInfo();
        }, 1000);
    }, []);

    function setTimeInfo(){
        runScript(tab, 
        () => {
            const videos = document.getElementsByTagName("video");
            const results = Array.from(videos).map(v => ({
                duration: v.duration ?? 0,
                curTime: v.currentTime,
                paused: v.paused
            }));
            if(results && results.length > 0)
                return results[0];
        },
        (result) => {
            if(!result)
                return;
            
            setCurrentTime(result.curTime);
            setMaxTime(result.duration);
            setIsPlaying(!result.paused);
            setVisible(result.duration != undefined);
        });
    }

    function clickPreview(e){
        let isShowing = !isShowingPreview;
        setIsShowingPreview(!isShowingPreview);

        if(previewInterval != null && !isShowing)
            clearInterval(previewInterval);
        else{
            let interval = setInterval(() => {
                runScript(tab, 
                () => {
                    const video = document.getElementsByTagName("video")[0];
                    const canvas = document.createElement('canvas');
                    canvas.width = 300;
                    canvas.height = video.videoHeight * 300/video.videoWidth;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    return canvas.toDataURL('image/png');
                },
                (url) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;

                    const ctx = canvas.getContext("2d");
                    const img = new Image();
                    img.src = url;
                    img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    };
                });
            }, 20);
            setPreviewInterval(interval);
        }
    }
    function clickPrevious(e){
        runScript(tab, 
        () => {
            let div = document.querySelector(".ytmusic-player-bar.previous-button");
            div.children[0].click();
        },
        () => {});
        const intervalo = setInterval(() => {
            chrome.tabs.get(tab.id, (tab) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    return;
                }
                if(tab.title != title){
                    setTitle(tab.title);
                    clearInterval(intervalo);
                }
            });
        }, 500);
    }
    function clickGoBack(e){
        runScript(tab, 
        () => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime -= 15;
        },
        () => {});
        setTimeInfo();
    }
    function clickPlay(e){
        runScript(tab, 
    () => {
        const video = document.getElementsByTagName("video")[0];
        video.paused ? video.play() : video.pause();
        return video.paused;
    },
    (paused) => {
        setIsPlaying(!paused);
    });
    }
    function clickGoForth(e){
        runScript(tab, 
        () => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime += 15;
        },
        () => {});
        setTimeInfo();
    }
    function clickNext(e){
        runScript(tab, 
        () => {
            let div = document.querySelector(".ytmusic-player-bar.next-button");
            div.children[0].click();
        },
        () => {});
        const intervalo = setInterval(() => {
            chrome.tabs.get(tab.id, (tab) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    return;
                }
                if(tab.title != title){
                    setTitle(tab.title);
                    clearInterval(intervalo);
                }
            });
        }, 500);
    }
    function clickClose(e){
        chrome.tabs.remove(tab.id);
    }
    function changeSlider(e){
        setCurrentTime(Number(e.target.value));
        runScript(tab, 
        (sliderTime) => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime = sliderTime;
        },
        () => {}, [Number(e.target.value)]);
        setTimeInfo();
    }

    return visible && (
        <div class="tab-view">
            <div class="title-view">
                <span class="title-span" title={title}>
                    {title}
                </span>
            </div>
            <div class="controlls-view">
                <button onClick={clickPrevious} class="controlls-btn"><img class="rotated" src={ForwardStepIcon}/></button>
                <button onClick={clickGoBack} class="controlls-btn"><img class="rotated" src={ForwardIcon}/></button>
                <button onClick={clickPlay} class="controlls-btn-play"><img src={(isPlaying ? PauseIcon : PlayIcon)}/></button>
                <button onClick={clickGoForth} class="controlls-btn"><img src={ForwardIcon}/></button>
                <button onClick={clickNext} class="controlls-btn"><img src={ForwardStepIcon}/></button>
                <div class="controlls-timer">
                    <span class="controlls-time-span1">{formatTime(currentTime)}</span>
                    <span class="controlls-time-span1-2">/</span>
                    <span class="controlls-time-span2">{formatTime(maxTime)}</span>
                </div>
            </div>
            <div class="slider-view">
                <input class="slider-input" type='range' min="0" max={maxTime} value={currentTime} onChange={changeSlider}></input>
            </div>
        </div>
    );
}
