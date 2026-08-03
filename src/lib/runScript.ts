/**
 * Runs `gather` inside the given tab and hands its return value to `consume`.
 *
 * `gather` is serialised and injected, so it must stay self-contained: it can
 * only use its own arguments and page globals, never module scope.
 */
export default function runScript<A extends unknown[], R>(
    tab: chrome.tabs.Tab,
    gather: (...args: A) => R,
    consume: (result: Awaited<R>) => void,
    argus?: A
){
    if(tab.id === undefined)
        return;

    chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: gather,
            args: argus
        },
        (results) => {
            // A tab Chrome has unloaded has no page to inject into, so the call
            // fails and reports no results. Reading lastError here is also what
            // keeps Chrome from logging it: every caller polls on a timer, so an
            // unhandled failure would repeat every tick.
            if(chrome.runtime.lastError || !results || results.length === 0)
                return;

            // A single frame is targeted, so there is exactly one result. Chrome
            // types it as optional because a failed frame reports no value.
            consume(results[0].result as Awaited<R>);
        }
    );
}
