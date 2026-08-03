import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import '../styles/TabView.css'
import ForwardIcon from '../assets/forward-solid-full.svg';
import ForwardStepIcon from '../assets/forward-step-solid-full.svg';
import PauseIcon from '../assets/pause-solid-full.svg';
import PlayIcon from '../assets/play-solid-full.svg';
import VolumeControl from './VolumeControl';
import { applyVolumeInPage } from '../lib/pageAudio';
import runScript from '../lib/runScript';
import formatTime from '../lib/formatTime';

type MusicTabViewProps = {
    tab: chrome.tabs.Tab;
};

export default function MusicTabView({ tab }: MusicTabViewProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [maxTime, setMaxTime] = useState(0);
    const [title, setTitle] = useState("");
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const isAdjustingVolumeRef = useRef(false);

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
                // A player that has not loaded metadata reports NaN, and a live
                // stream reports Infinity. Both survive `??` but are flattened to
                // null by the JSON round trip out of the tab, so normalise here.
                duration: Number.isFinite(v.duration) ? v.duration : 0,
                curTime: v.currentTime,
                paused: v.paused,
                volume: window.__yctrlGain ? window.__yctrlGain.gain.value : v.volume,
                muted: v.muted
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
            // Skip while dragging, otherwise the poll snaps the slider back.
            if(!isAdjustingVolumeRef.current){
                setVolume(result.volume);
                setMuted(result.muted);
            }
        });
    }

    function clickPrevious(){
        runScript(tab,
        () => {
            const div = document.querySelector(".ytmusic-player-bar.previous-button");
            (div?.children[0] as HTMLElement | undefined)?.click();
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
            const div = document.querySelector(".ytmusic-player-bar.next-button");
            (div?.children[0] as HTMLElement | undefined)?.click();
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

    return (
        <div className="tab-view">
            <div className="title-view">
                <span className="title-span" title={title}>
                    {title}
                </span>
            </div>
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
        </div>
    );
}
