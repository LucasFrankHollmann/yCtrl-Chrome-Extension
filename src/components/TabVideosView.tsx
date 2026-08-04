import { useState, useEffect, useRef } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import '../styles/TabVideosView.css';
import { tabUrl } from '../lib/tabState';
import { listVideosInTab, thumbnailUrl } from '../lib/pageVideos';
import type { PageVideoList } from '../lib/pageVideos';
import { searchInTab, goHomeInTab } from '../lib/pageSearch';
import runScript from '../lib/runScript';

/**
 * Injection into a loaded page answers in a few ms, so anything past this is a page
 * that cannot be read at all rather than one being slow.
 */
const READ_TIMEOUT_MS = 3000;
/** The page is re-read on a timer, because YouTube navigates itself with no event to wait on. */
const POLL_MS = 1000;
/**
 * How long the page's own search box is given to navigate before the search is redone
 * through the URL. Submitting cannot be checked from inside the page — the navigation is
 * asynchronous — so this is what tells a working submit from a swallowed one.
 */
const SEARCH_VERIFY_MS = 1800;
/** How long a submitted search is given to show up before its results are trusted anyway. */
const SEARCH_TIMEOUT_MS = 8000;
/** Where a search goes when the page's own box could not be made to take it. */
const RESULTS_URL = 'https://www.youtube.com/results?search_query=';

type TabVideosViewProps = {
    /** undefined once the tab has been closed, which the screen reports in its place. */
    tab: chrome.tabs.Tab | undefined;
    onBack: () => void;
};

/**
 * The popup's second screen: every video the tab's page lists, plus a way to search for
 * more. Reached by clicking the tab's card, left through the back button in the corner.
 *
 * Searching and going home drive YouTube's own search box and logo rather than pointing
 * the tab at a URL, so the page navigates itself and the popup stays open throughout.
 * Nothing here activates a tab — clicking a video opens one in the background.
 */
export default function TabVideosView({ tab, onBack }: TabVideosViewProps) {
    const [list, setList] = useState<PageVideoList | null>(null);
    const [failed, setFailed] = useState(false);
    const [query, setQuery] = useState("");
    /**
     * A submitted search that the page has not caught up with yet. Held so the previous
     * results are not passed off as the new ones while YouTube navigates.
     */
    const [awaiting, setAwaiting] = useState<string | null>(null);
    // The poll callback is created once, so it reads this through a ref rather than
    // closing over a value that goes stale on the first render.
    const awaitingRef = useRef<string | null>(null);
    const verifyRef = useRef<number | undefined>(undefined);
    const giveUpRef = useRef<number | undefined>(undefined);
    // The tab object is replaced on every poll in Popup, so the read is keyed on the id
    // and reaches the current object through a ref instead of restarting each second.
    const tabRef = useRef(tab);
    tabRef.current = tab;

    function stopAwaiting(){
        clearTimeout(verifyRef.current);
        clearTimeout(giveUpRef.current);
        awaitingRef.current = null;
        setAwaiting(null);
    }
    /** Redoes a search through the URL, reloading YouTube, which is why it is the fallback. */
    function searchByUrl(tabId: number | undefined, text: string){
        if(tabId !== undefined)
            chrome.tabs.update(tabId, { url: RESULTS_URL + encodeURIComponent(text) });
    }

    const tabId = tab?.id;
    useEffect(() => {
        const target = tabRef.current;
        if(!target)
            return;

        let answered = false;
        // Taken as an argument rather than closed over, so the tab stays non-optional
        // inside a function declaration the flow analysis cannot follow.
        function poll(read: chrome.tabs.Tab){
            runScript(read, listVideosInTab, (result) => {
                answered = true;
                setList(result);
                setFailed(false);

                // The page is showing the search that was asked for, so the rows below
                // are the new results and not the ones they replaced.
                if(awaitingRef.current !== null && result.query === awaitingRef.current)
                    stopAwaiting();
            });
        }
        poll(target);
        // runScript drops a failed injection silently, on purpose: its callers poll, and
        // a per-tick error would be noise. Here that silence has to become something the
        // screen can say, so a first read that never lands is what reports it.
        const timeout = setTimeout(() => {
            if(!answered)
                setFailed(true);
        }, READ_TIMEOUT_MS);
        const interval = setInterval(() => poll(target), POLL_MS);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [tabId]);

    // Only on unmount: a pending search must outlive re-renders, but not the screen.
    useEffect(() => () => {
        clearTimeout(verifyRef.current);
        clearTimeout(giveUpRef.current);
    }, []);

    function submitSearch(event: FormEvent){
        event.preventDefault();
        const target = tabRef.current;
        const text = query.trim();
        if(!text || !target)
            return;

        clearTimeout(verifyRef.current);
        clearTimeout(giveUpRef.current);
        awaitingRef.current = text;
        setAwaiting(text);

        // The page's search box is preferred but not trusted. Whether a submit was
        // actually wired up is only visible in whether the page navigated, so if the
        // query has not arrived by now, the search is redone the way that always works.
        verifyRef.current = setTimeout(() => {
            if(awaitingRef.current !== text)
                return;

            // Asked of the page directly rather than read off the last poll, which can
            // predate the navigation by a whole tick and condemn a search that worked.
            // A read that fails answers too: the page is mid-load, so it did navigate.
            runScript(target, listVideosInTab, (result) => {
                setList(result);
                if(result.query === text)
                    stopAwaiting();
                else
                    searchByUrl(target.id, text);
            });
        }, SEARCH_VERIFY_MS);
        // YouTube may never show this query — it redirects some searches to a channel —
        // so the wait is bounded and the rows come back either way.
        giveUpRef.current = setTimeout(stopAwaiting, SEARCH_TIMEOUT_MS);

        runScript(target, searchInTab, (used) => {
            // No search box on the page at all, so there is nothing to wait on.
            if(!used){
                clearTimeout(verifyRef.current);
                searchByUrl(target.id, text);
            }
        }, [text]);
    }
    /** Always the logo, whatever page the tab is on — including the home feed itself. */
    function clickHome(){
        const target = tabRef.current;
        if(!target)
            return;

        // Home is not a search, so anything being waited on is no longer coming.
        stopAwaiting();

        runScript(target, goHomeInTab, (used) => {
            if(used || target.id === undefined)
                return;

            chrome.tabs.update(target.id, { url: 'https://www.youtube.com/' });
        });
    }
    function clickVideo(url: string){
        // Opened in the background and next to its source tab: the popup survives, so
        // several videos can be picked in one visit, and they land where they belong.
        chrome.tabs.create({
            url,
            active: false,
            windowId: tabRef.current?.windowId,
            index: tabRef.current === undefined ? undefined : tabRef.current.index + 1
        });
    }
    function keyDownRow(event: KeyboardEvent, url: string){
        // A div standing in for a button answers the keys one would.
        if(event.key !== 'Enter' && event.key !== ' ')
            return;

        event.preventDefault();
        clickVideo(url);
    }

    if(!tab)
        return (
            <div className="tab-videos-view">
                <div className="videos-bar">
                    <div className="videos-head">
                        <button className="back-btn" onClick={onBack} title="Back to the tab list">←</button>
                        <span className="videos-title">Tab closed</span>
                    </div>
                </div>
                <div className="videos-note">This tab was closed while you were looking at it.</div>
            </div>
        );

    const videos = list?.videos ?? [];
    const hidden = list ? list.total - videos.length : 0;

    return (
        <div className="tab-videos-view">
            {/* Sticky, so the way back and the search stay reachable however far the list scrolls. */}
            <div className="videos-bar">
                <div className="videos-head">
                    <button className="back-btn" onClick={onBack} title="Back to the tab list">←</button>
                    <span className="videos-title" title={tab.title || tabUrl(tab)}>
                        {tab.title || tabUrl(tab)}
                    </span>
                    <button
                        className="text-btn"
                        onClick={clickHome}
                        title="Click YouTube's logo, taking the page to the home feed"
                    >home</button>
                </div>
                <form className="videos-search" onSubmit={submitSearch}>
                    <input
                        className="search-input"
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search YouTube…"
                        aria-label="Search YouTube"
                    />
                    <button
                        className="text-btn"
                        type="submit"
                        title="Type this into the page's own search box and submit it"
                    >go</button>
                </form>
            </div>
            {
                !list && !failed &&
                <div className="videos-note">Reading the page…</div>
            }
            {
                failed &&
                <div className="videos-note">This page could not be read.</div>
            }
            {
                awaiting !== null &&
                <div className="videos-note">Searching for “{awaiting}”…</div>
            }
            {
                list && videos.length === 0 && awaiting === null &&
                <div className="videos-note">No videos listed on this page.</div>
            }
            {/* Dimmed while a search is in flight, because these are still the old rows. */}
            <div className={"video-list" + (awaiting !== null ? " stale" : "")}>
                {
                    videos.map((video) => (
                        <div
                            className="video-row"
                            key={video.videoId}
                            onClick={() => clickVideo(video.url)}
                            onKeyDown={(event) => keyDownRow(event, video.url)}
                            role="button"
                            tabIndex={0}
                            title={"Open in a background tab: " + (video.title || video.url)}
                        >
                            <div className="video-thumb">
                                <img src={thumbnailUrl(video.videoId)} alt="" loading="lazy"/>
                                {
                                    video.duration &&
                                    <span className="video-duration">{video.duration}</span>
                                }
                            </div>
                            <div className="video-text">
                                {/* A thumbnail-only link on a page that names it nowhere else. */}
                                <span className="video-title">{video.title || "(untitled)"}</span>
                                <span className="video-meta">
                                    {video.isShort && <span className="short-badge">short</span>}
                                    {
                                        // A channel page lists its own videos without repeating
                                        // whose they are, so the line is the age alone there.
                                        video.channel &&
                                        <span className="video-channel">{video.channel}</span>
                                    }
                                    {
                                        video.channel && video.published &&
                                        <span className="meta-dot">·</span>
                                    }
                                    {video.published}
                                </span>
                            </div>
                        </div>
                    ))
                }
            </div>
            {
                hidden > 0 &&
                <div className="videos-note">{hidden} more on the page, not shown.</div>
            }
        </div>
    );
}
