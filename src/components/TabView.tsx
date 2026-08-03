import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import '../styles/TabView.css'
import ForwardIcon from '../assets/forward-solid-full.svg';
import ForwardStepIcon from '../assets/forward-step-solid-full.svg';
import PauseIcon from '../assets/pause-solid-full.svg';
import PlayIcon from '../assets/play-solid-full.svg';
import EyeIcon from '../assets/eye-solid-full.svg';
import PipIcon from '../assets/pip-solid-full.svg';
import VolumeControl from './VolumeControl';
import SpeedControl, { MIN_SPEED, MAX_SPEED } from './SpeedControl';
import { applyVolumeInPage } from '../lib/pageAudio';
import runScript from '../lib/runScript';
import formatTime from '../lib/formatTime';

type TabViewProps = {
    tab: chrome.tabs.Tab;
};

export default function TabView({ tab }: TabViewProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isShowingPreview, setIsShowingPreview] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playSpeed, setPlaySpeed] = useState(1);
    const [maxTime, setMaxTime] = useState(0);
    const [title, setTitle] = useState("");
    const [visible, setVisible] = useState(true);
    const [previewInterval, setPreviewInterval] = useState<ReturnType<typeof setInterval> | null>(null);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [isPip, setIsPip] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isAdjustingVolumeRef = useRef(false);
    const isAdjustingSpeedRef = useRef(false);

    useEffect(() => {
        setTimeInfo();
        const interval = setInterval(() => {
            setTimeInfo();
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setTitle(tab.title ?? "");
    }, [tab.title]);

    function setTimeInfo(){
        runScript(tab,
        () => {
            const videos = document.getElementsByTagName("video");
            const results = Array.from(videos).map(v => ({
                duration: v.duration ?? 0,
                curTime: v.currentTime,
                paused: v.paused,
                playbackRate: v.playbackRate,
                volume: window.__yctrlGain ? window.__yctrlGain.gain.value : v.volume,
                muted: v.muted,
                pip: document.pictureInPictureElement === v
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
            // Skip while dragging, otherwise the poll snaps the slider back.
            if(!isAdjustingVolumeRef.current){
                setVolume(result.volume);
                setMuted(result.muted);
            }
            if(!isAdjustingSpeedRef.current)
                setPlaySpeed(result.playbackRate);
            setIsPip(result.pip);
        });
    }

    function clickPreview(){
        const isShowing = !isShowingPreview;
        setIsShowingPreview(!isShowingPreview);

        if(previewInterval != null && !isShowing)
            clearInterval(previewInterval);
        else{
            const interval = setInterval(() => {
                runScript(tab,
                () => {
                    const video = document.getElementsByTagName("video")[0];
                    const canvas = document.createElement('canvas');
                    canvas.width = 300;
                    canvas.height = video.videoHeight * 300/video.videoWidth;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
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
                        ctx?.clearRect(0, 0, canvas.width, canvas.height);
                        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    };
                });
            }, 20);
            setPreviewInterval(interval);
        }
    }
    function clickPip(){
        runScript(tab,
        async () => {
            const video = document.getElementsByTagName("video")[0];
            if(!video)
                return "no video in the tab";

            if(document.pictureInPictureElement === video){
                await document.exitPictureInPicture();
                return null;
            }

            // YouTube sets this attribute on some players, and it blocks the
            // request outright.
            video.disablePictureInPicture = false;
            try {
                await video.requestPictureInPicture();
                return null;
            }
            catch (err) {
                return (err as Error).message;
            }
        },
        (error) => {
            // Most likely cause is the missing user activation described below.
            if(error)
                console.error("yCtrl: picture-in-picture failed -", error);
            setTimeInfo();
        });
    }
    function clickPrevious(){
        runScript(tab,
        () => {
            document.querySelector<HTMLElement>(".ytp-prev-button")?.click();
        },
        () => {});
        watchTitle();
    }
    function clickGoBack(){
        runScript(tab,
        () => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime -= 15;
        },
        () => {});
        setTimeInfo();
    }
    function clickPlay(){
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
        setIsPlaying(!paused);
    });
    }
    function clickGoForth(){
        runScript(tab,
        () => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime += 15;
        },
        () => {});
        setTimeInfo();
    }
    function clickNext(){
        runScript(tab,
        () => {
            document.querySelector<HTMLElement>(".ytp-next-button")?.click();
        },
        () => {});
        watchTitle();
    }
    /** The tab title lags behind a track change, so poll until it catches up. */
    function watchTitle(){
        if(tab.id === undefined)
            return;
        const tabId = tab.id;
        const intervalo = setInterval(() => {
            chrome.tabs.get(tabId, (updated) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    return;
                }
                if(updated.title != title){
                    setTitle(updated.title ?? "");
                    clearInterval(intervalo);
                }
            });
        }, 500);
    }
    function clickClose(){
        if(tab.id !== undefined)
            chrome.tabs.remove(tab.id);
    }
    function changeSlider(e: ChangeEvent<HTMLInputElement>){
        setCurrentTime(Number(e.target.value));
        runScript(tab,
        (sliderTime: number) => {
            const video = document.getElementsByTagName("video")[0];
            video.currentTime = sliderTime;
        },
        () => {}, [Number(e.target.value)]);
        setTimeInfo();
    }
    function applyVolume(newVolume: number, newMuted: boolean){
        runScript(tab, applyVolumeInPage, () => {}, [newVolume, newMuted]);
    }
    function changeVolume(newVolume: number){
        const newMuted = newVolume > 0 ? false : muted;
        setVolume(newVolume);
        setMuted(newMuted);
        applyVolume(newVolume, newMuted);
    }
    function toggleMute(){
        setMuted(!muted);
        applyVolume(volume, !muted);
    }
    function changeSpeed(newSpeed: number){
        const clamped = Math.min(Math.max(newSpeed, MIN_SPEED), MAX_SPEED);
        setPlaySpeed(clamped);
        runScript(tab,
        (speed: number) => {
            const video = document.getElementsByTagName("video")[0];
            video.playbackRate = speed;
        },
        () => {}, [clamped]);
    }

    return visible ? (
        <div className="tab-view">
            <div className="title-view">
                <button onClick={clickPreview} className="controlls-btn-preview" title="Toggle preview"><img src={EyeIcon}/></button>
                <button onClick={clickPip} className={"controlls-btn-pip" + (isPip ? " active" : "")}
                    title={isPip ? "Exit picture-in-picture" : "Picture-in-picture"}><img src={PipIcon}/></button>
                <span className="title-span" title={title}>
                    {title}
                </span>
                <span className="x-span" onClick={clickClose}>
                    x
                </span>
            </div>
            {
                isShowingPreview &&
                <div className="preview-view">
                    <canvas ref={canvasRef}></canvas>
                </div>
            }
            <div className="controlls-view">
                <button onClick={clickPrevious} className="controlls-btn"><img className="rotated" src={ForwardStepIcon}/></button>
                <button onClick={clickGoBack} className="controlls-btn"><img className="rotated" src={ForwardIcon}/></button>
                <button onClick={clickPlay} className="controlls-btn-play"><img src={(isPlaying ? PauseIcon : PlayIcon)}/></button>
                <button onClick={clickGoForth} className="controlls-btn"><img src={ForwardIcon}/></button>
                <button onClick={clickNext} className="controlls-btn"><img src={ForwardStepIcon}/></button>
                <div className="controlls-timer">
                    <span className="controlls-time-span1">{formatTime(currentTime)}</span>
                    <span className="controlls-time-span1-2">/</span>
                    <span className="controlls-time-span2">{formatTime(maxTime)}</span>
                </div>
            </div>
            <div className="slider-view">
                <input className="slider-input" type='range' min="0" max={maxTime} value={currentTime}
                    style={{ '--fill': (maxTime > 0 ? currentTime / maxTime * 100 : 0) + '%' } as CSSProperties}
                    onChange={changeSlider}></input>
            </div>
            <VolumeControl
                volume={volume}
                muted={muted}
                onChange={changeVolume}
                onToggleMute={toggleMute}
                onAdjustStart={() => isAdjustingVolumeRef.current = true}
                onAdjustEnd={() => isAdjustingVolumeRef.current = false}
            />
            <SpeedControl
                speed={playSpeed}
                onChange={changeSpeed}
                onAdjustStart={() => isAdjustingSpeedRef.current = true}
                onAdjustEnd={() => isAdjustingSpeedRef.current = false}
            />
        </div>
    ) : null;
}
