import { useState } from 'react';
import type { MouseEvent, KeyboardEvent } from 'react';
// The title row reuses the classes TabView defines, so both stylesheets are
// needed even when no playable tab is on screen.
import '../styles/TabView.css';
import '../styles/TabInfoView.css';
import { NO_PLAYER_REASON, isVideoUrl, tabUrl } from '../lib/tabState';
import type { NoPlayerReason } from '../lib/tabState';
import type { WakeTabMessage } from '../lib/messages';
import formatSince from '../lib/formatSince';

type TabInfoViewProps = {
    tab: chrome.tabs.Tab;
    reason: NoPlayerReason;
    /**
     * 'inactive' for a tab Chrome unloaded, or a video never started: dimmed, with
     * the reason on a badge. 'plain' for a page that is running and simply has no
     * player — it must not read as asleep, and its group header already names it.
     */
    variant?: 'inactive' | 'plain';
    /**
     * Makes the whole card open the videos the tab's page lists, on a screen of its own
     * inside the popup. Given only where the card has nothing to control, so drilling in
     * is what it can offer. The browser does not change tabs.
     */
    onOpen?: () => void;
};

/**
 * Card for a tab with no player to control, so it reports state instead of
 * offering transport.
 *
 * Reviving costs a visible flash of the tab, and that is not a shortcut: trying to
 * drive the page from here instead was measured and does not work, because YouTube
 * will not load media into a tab that has never been shown.
 */
export default function TabInfoView({ tab, reason, variant = 'inactive', onOpen }: TabInfoViewProps) {
    const [error, setError] = useState<string | null>(null);
    const { label, hint } = NO_PLAYER_REASON[reason];
    const url = tabUrl(tab);
    const isVideo = isVideoUrl(url);
    // A page with nothing playing has nothing to revive; it is already running.
    const canRevive = reason !== 'no-media';

    function clickClose(event: MouseEvent){
        // Closing must not also open the tab it just closed.
        event.stopPropagation();
        // Closing needs no page, so it works even while the tab is unloaded.
        if(tab.id !== undefined)
            chrome.tabs.remove(tab.id);
    }
    function keyDownCard(event: KeyboardEvent){
        // A div standing in for a button has to answer the keys a button would.
        if(event.key !== 'Enter' && event.key !== ' ')
            return;

        event.preventDefault();
        onOpen?.();
    }
    function clickWake(){
        const tabId = tab.id;
        if(tabId === undefined)
            return;

        setError(null);

        // The round trip has to be handed to the service worker: activating the tab
        // closes this popup, so anything scheduled here to switch back would die
        // with it. The reply is ignored for the same reason.
        chrome.tabs.query({ active: true, currentWindow: true }, ([current]) => {
            const message: WakeTabMessage = {
                action: 'WAKE_TAB',
                tabId,
                returnToTabId: current?.id
            };
            chrome.runtime.sendMessage(message, () => {
                const failure = chrome.runtime.lastError;
                if(failure)
                    setError(failure.message ?? "the service worker did not answer");
            });
        });
    }

    return (
        <div
            className={"tab-info-view " + variant + (onOpen ? " clickable" : "")}
            onClick={onOpen}
            onKeyDown={onOpen ? keyDownCard : undefined}
            role={onOpen ? "button" : undefined}
            tabIndex={onOpen ? 0 : undefined}
            title={onOpen ? "List the videos on this page" : undefined}
        >
            <div className="title-view">
                {
                    variant === 'inactive' &&
                    <span className={"reason-badge " + reason} title={hint}>{label}</span>
                }
                <span className="title-span" title={hint}>{tab.title || url}</span>
                <span className="x-span" onClick={clickClose} title="Close tab">x</span>
            </div>
            <div className="tab-info-meta">
                <span className={"tab-info-kind" + (isVideo ? " video" : "")}>
                    {isVideo ? "Video" : "YouTube page"}
                </span>
                {
                    // lastAccessed landed in Chrome 121, so older builds omit it.
                    tab.lastAccessed ? " · Last active " + formatSince(tab.lastAccessed) : ""
                }
                {
                    // Not a button: the whole card already is one, and a control inside
                    // a control is a click target that fights its own parent.
                    onOpen &&
                    <span className="tab-info-actions">
                        <span className="go-hint">videos ›</span>
                    </span>
                }
                {
                    canRevive &&
                    <span className="tab-info-actions">
                        <button
                            className="revive-btn"
                            onClick={clickWake}
                            title="Shows the tab just long enough for its player to load, then switches straight back. The popup closes while that happens."
                        >wake</button>
                    </span>
                }
            </div>
            {
                error &&
                <div className="tab-info-error" title={error}>Refused: {error}</div>
            }
        </div>
    );
}
