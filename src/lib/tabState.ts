import type { PageProbe } from './pageProbe';

/** Why Chrome is no longer running a tab's page, so it cannot be injected into. */
export type UnloadedReason = 'discarded' | 'frozen' | 'unloaded';

/**
 * Why a tab has no player to control. The unload reasons come from the tab fields
 * Chrome exposes; the last two come from probing the page, which is loaded and
 * running but has nothing playing in it.
 */
export type NoPlayerReason = UnloadedReason | 'not-started' | 'no-media';

/** Badge text and tooltip shown for each reason by TabInfoView. */
export const NO_PLAYER_REASON: Record<NoPlayerReason, { label: string, hint: string }> = {
    discarded: {
        label: 'unloaded',
        hint: 'Chrome dropped this page from memory to free RAM. It reloads from scratch when activated.'
    },
    frozen: {
        label: 'frozen',
        hint: 'Chrome suspended this page. The content is still in memory, but no script can run until it is activated.'
    },
    unloaded: {
        label: 'not loaded',
        hint: 'This tab has never been opened, so its page was never loaded.'
    },
    'not-started': {
        label: 'not started',
        hint: 'The page is loaded but its player is not. This video has never been opened, so there is nothing to control yet.'
    },
    'no-media': {
        label: 'no media',
        hint: 'A YouTube page with nothing playing, so there is no player to control.'
    }
};

/** What the popup should render for a tab. */
export type TabClass =
    | { kind: 'playable' }
    | { kind: 'no-player', reason: NoPlayerReason }
    // The probe has not answered yet, so it is too early to commit to a card.
    | { kind: 'unknown' };

/**
 * A tab restored from a previous session, or opened in the background, reports
 * its target in `pendingUrl` until the navigation commits, so `url` alone misses
 * tabs that were never opened.
 */
export function tabUrl(tab: chrome.tabs.Tab){
    return tab.url || tab.pendingUrl || "";
}

/**
 * Whether the URL points at one piece of media. Everything else on YouTube is a
 * browsing surface, where a player only exists while the miniplayer is running.
 */
export function isVideoUrl(url: string){
    return /youtube\.com\/(watch|shorts\/|live\/|embed\/)/.test(url);
}

/** Null when Chrome still has the page loaded, so runScript can reach it. */
export function unloadedReason(tab: chrome.tabs.Tab): UnloadedReason | null {
    if(tab.discarded)
        return 'discarded';
    // A frozen tab still has its DOM, but its task queue is suspended, so an
    // injected function is only queued and never actually runs.
    if(tab.frozen)
        return 'frozen';
    if(tab.status === 'unloaded')
        return 'unloaded';

    return null;
}

/**
 * Being loaded is not enough to earn the full controls: YouTube mounts its player
 * lazily, so a tab the user never opened has a <video> with nothing in it.
 */
export default function classifyTab(tab: chrome.tabs.Tab, probe: PageProbe | undefined): TabClass {
    const reason = unloadedReason(tab);
    if(reason)
        return { kind: 'no-player', reason };

    if(!probe)
        return { kind: 'unknown' };

    if(probe.hasVideo && probe.ready)
        return { kind: 'playable' };

    // A video whose player never loaded reads differently from a browsing page
    // that simply has nothing playing, so the URL decides which one it is.
    return { kind: 'no-player', reason: isVideoUrl(tabUrl(tab)) ? 'not-started' : 'no-media' };
}
