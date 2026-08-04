/**
 * Driving YouTube's own chrome from the popup: its search box and its logo, rather
 * than pointing the tab at a URL.
 *
 * Using the page's controls keeps YouTube navigating itself — its app state, history
 * and suggestions all stay intact, where an address-bar navigation would reload the
 * whole application. Both functions report false when the control is not on the page,
 * which is the caller's signal to fall back to a URL.
 */

// These functions are injected into the tab by runScript, so they must stay
// self-contained: no imports and no closure over module scope.

/**
 * Types the query into YouTube's search box and submits it.
 *
 * Every route below submits the same query, so a redundant one costs a repeated
 * navigation to an identical URL and nothing else. They are all attempted because
 * which one is wired up differs by layout, and none of them can be checked from here:
 * the navigation is asynchronous, so the caller verifies it instead.
 */
export function searchInTab(query: string): boolean {
    const INPUT = 'input#search, input[name="search_query"], input.ytSearchboxComponentInput';
    const BUTTON = '#search-icon-legacy, button.ytSearchboxComponentSearchButton';

    const input = document.querySelector(INPUT) as HTMLInputElement | null;
    if(!input)
        return false;

    input.focus();

    // Assigned through the prototype setter rather than the property, because the
    // searchbox mirrors its input into state of its own and watches the setter to
    // notice. A plain assignment can leave it submitting the previous query.
    const assign = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if(assign)
        assign.call(input, query);
    else
        input.value = query;

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Enter first: it is how a person searches, and it does not depend on the page's
    // language the way finding the submit button by its label would. keyCode is carried
    // alongside key for the builds that still read it.
    for(const type of ['keydown', 'keypress', 'keyup'])
        input.dispatchEvent(new KeyboardEvent(type, {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        } as KeyboardEventInit));

    input.closest('form')?.requestSubmit();

    // The legacy button is left in the DOM, hidden, on layouts that no longer use it,
    // and clicking that does nothing at all — so it has to be on screen to be worth it.
    const button = document.querySelector(BUTTON) as HTMLElement | null;
    if(button && button.offsetParent !== null)
        button.click();

    return true;
}

/** Clicks YouTube's logo, which is its own way home. */
export function goHomeInTab(): boolean {
    const logo = document.querySelector('a#logo, ytd-topbar-logo-renderer a, a#logo-icon');
    if(!logo)
        return false;

    (logo as HTMLElement).click();
    return true;
}
