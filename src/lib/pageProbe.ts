/** Shape read back by the classifier in Popup. */
export type PageProbe = {
    hasVideo: boolean;
    ready: boolean;
};

// This function is injected into the tab by runScript, so it must stay
// self-contained: no imports and no closure over module scope.

/** Cheap check for whether a page has a player worth showing controls for. */
export function probePageInTab(): PageProbe {
    const video = document.getElementsByTagName("video")[0];
    if(!video)
        return { hasVideo: false, ready: false };

    // readyState 0 (HAVE_NOTHING) means the element is mounted but its media was
    // never loaded, which is what YouTube leaves behind in a tab the user has not
    // opened yet. Duration cannot be used as the signal: a live stream reports
    // Infinity while being perfectly playable.
    return { hasVideo: true, ready: video.readyState > 0 };
}
