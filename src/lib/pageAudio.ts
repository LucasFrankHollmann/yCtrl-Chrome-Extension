declare global {
    interface Window {
        __yctrlCtx?: AudioContext;
        __yctrlGain?: GainNode;
    }
}

/** Shape read back by the pollers in TabView / MusicTabView. */
export type MediaState = {
    duration: number;
    curTime: number;
    paused: boolean;
    volume: number;
    muted: boolean;
    playbackRate: number;
};

// This function is injected into the tab by runScript, so it must stay
// self-contained: no imports and no closure over module scope.

export function applyVolumeInPage(volume: number, muted: boolean){
    const video = document.getElementsByTagName("video")[0];
    if(!video)
        return null;

    // The <video> element caps volume at 1, so anything above that has to go
    // through a GainNode. The graph is kept on window because
    // createMediaElementSource can only be called once per element, and the
    // popup is torn down and recreated on every open.
    if(volume > 1 && !window.__yctrlGain){
        const ctx = new AudioContext();
        const source = ctx.createMediaElementSource(video);
        const gain = ctx.createGain();
        source.connect(gain);
        gain.connect(ctx.destination);
        window.__yctrlCtx = ctx;
        window.__yctrlGain = gain;
    }

    const ctx = window.__yctrlCtx;
    const gain = window.__yctrlGain;

    if(ctx && gain){
        // Once the audio is routed through the graph the element stays at full
        // volume and the gain node is the single source of truth.
        video.volume = 1;
        gain.gain.value = volume;
        if(ctx.state === "suspended")
            ctx.resume();
    }
    else
        video.volume = volume;

    video.muted = muted;
    return { volume: volume, muted: muted };
}
