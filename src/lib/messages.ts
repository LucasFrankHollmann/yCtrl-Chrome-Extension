/**
 * Message contract between the popup and the service worker.
 *
 * The popup cannot do this work itself: activating another tab closes the popup and
 * destroys its scripts, so whatever was going to switch back would never run.
 */
export type WakeTabMessage = {
    action: 'WAKE_TAB';
    /** The tab to show. */
    tabId: number;
    /** The tab to return to once the player is up; undefined leaves the target open. */
    returnToTabId: number | undefined;
};

export function isWakeTabMessage(message: unknown): message is WakeTabMessage {
    return typeof message === 'object' && message !== null
        && (message as WakeTabMessage).action === 'WAKE_TAB';
}
