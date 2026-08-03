// Background service worker.
//
// It exists for one job: showing a tab long enough for YouTube to mount its player,
// then putting the user back where they were. This cannot live in the popup, which
// is torn down the moment the active tab changes.

import { probePageInTab } from '../lib/pageProbe';
import { isWakeTabMessage } from '../lib/messages';

/** Give up returning focus after this long, so a stuck page cannot trap the user. */
const READY_TIMEOUT_MS = 4000;
const POLL_MS = 100;

chrome.runtime.onMessage.addListener((message) => {
    if(isWakeTabMessage(message))
        wakeTab(message.tabId, message.returnToTabId);

    // No response is sent: the popup is already gone by the time this finishes.
});

function delay(ms: number){
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** True once the tab has a player with media attached. */
async function isPlayerReady(tabId: number){
    try {
        const [injection] = await chrome.scripting.executeScript({
            target: { tabId },
            func: probePageInTab
        });
        return injection?.result?.ready === true;
    }
    catch {
        // Mid-navigation the frame refuses injection, which just means "not yet".
        return false;
    }
}

async function wakeTab(tabId: number, returnToTabId: number | undefined){
    const target = await chrome.tabs.get(tabId);

    // Being visible is the only thing that makes YouTube load the media, and the
    // window has to be raised too when the tab lives in a different one.
    await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(target.windowId, { focused: true });

    // Poll instead of waiting a fixed time, so focus goes back as soon as the player
    // is up and the visible flash stays as short as it can be.
    const deadline = Date.now() + READY_TIMEOUT_MS;
    while(Date.now() < deadline){
        if(await isPlayerReady(tabId))
            break;

        await delay(POLL_MS);
    }

    if(returnToTabId === undefined || returnToTabId === tabId)
        return;

    // The tab the user was on may have been closed in the meantime, so failing to
    // return is not an error worth surfacing anywhere.
    try {
        const previous = await chrome.tabs.get(returnToTabId);
        await chrome.tabs.update(returnToTabId, { active: true });
        await chrome.windows.update(previous.windowId, { focused: true });
    }
    catch {
        return;
    }
}
