/** One video listed somewhere on a YouTube page. */
export type PageVideo = {
    videoId: string;
    url: string;
    /** Empty when no link to the video carried any text, which the list then labels. */
    title: string;
    /** Channel that posted it. Empty on a surface that does not name one, like a channel's own page. */
    channel: string;
    /** Runtime badge as the page printed it, so a live stream reads as live, not as a clock. */
    duration: string;
    /** Age as the page printed it, in the page's own language. Empty where it is not shown. */
    published: string;
    isShort: boolean;
};

export type PageVideoList = {
    videos: PageVideo[];
    /** Videos on the page, which exceeds videos.length on a long feed. */
    total: number;
    /**
     * The search the page is currently showing, or "" anywhere else. This is how a
     * submitted search is told apart from the results it replaces: YouTube navigates
     * itself, so there is no load event to wait on, only the query catching up.
     */
    query: string;
};

/** Thumbnail URL for a video id. Derived, so no image element has to be scraped. */
export function thumbnailUrl(videoId: string){
    return "https://i.ytimg.com/vi/" + videoId + "/mqdefault.jpg";
}

// This function is injected into the tab by runScript, so it must stay
// self-contained: no imports and no closure over module scope.

/**
 * Every video the page is currently showing, in the order it lists them.
 *
 * Links are the anchor of this, not element selectors: YouTube renames its custom
 * elements between releases, but a link to a video stays a link to a video. Selectors
 * only enrich what an href already found, and each field falls back to something
 * structural, so a rename costs precision rather than the field.
 *
 * "Currently showing" is load-bearing rather than a nicety — see the filter below.
 */
export function listVideosInTab(): PageVideoList {
    // A feed keeps growing as it is scrolled, and the whole list crosses a message
    // boundary, so it is cut off well before that gets expensive. Generous, so that a
    // page the user has scrolled a long way through still comes back whole.
    const MAX = 250;

    // Every surface that wraps one video together with its metadata. Missing one only
    // means its videos come back with fewer fields, never that they are dropped.
    const CARD = 'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer,'
        + ' ytd-grid-video-renderer, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer,'
        + ' ytd-reel-item-renderer, yt-lockup-view-model, ytm-shorts-lockup-view-model';
    const TITLE = ['#video-title', '.yt-lockup-metadata-view-model-wiz__title', 'h3'];
    const CHANNEL = ['ytd-channel-name #text', '#channel-name #text',
        '.yt-content-metadata-view-model-wiz__metadata-text'];
    const DURATION = ['ytd-thumbnail-overlay-time-status-renderer #text',
        '.badge-shape-wiz__text', 'badge-shape'];
    /** A runtime badge, and nothing else in a card, is entirely a timestamp. */
    const TIMESTAMP = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;

    /** The video a link points at, or "" for every other link on the page. */
    function videoIdOf(anchor: HTMLAnchorElement){
        let url: URL;
        try {
            // href is already resolved against the page, so relative paths need no work.
            url = new URL(anchor.href);
        }
        catch {
            return { id: "", isShort: false };
        }

        if(url.pathname === '/watch')
            return { id: url.searchParams.get('v') ?? "", isShort: false };

        const shorts = /^\/shorts\/([^/]+)/.exec(url.pathname);
        return { id: shorts ? shorts[1] : "", isShort: shorts !== null };
    }
    function tidy(text: string | null | undefined){
        return (text ?? "").replace(/\s+/g, ' ').trim();
    }
    /** First of the selectors that matches and has text, or "" when none do. */
    function textIn(card: Element | null, selectors: string[]){
        if(!card)
            return "";

        for(const selector of selectors){
            const text = tidy(card.querySelector(selector)?.textContent);
            if(text)
                return text;
        }

        return "";
    }
    function channelOf(card: Element | null){
        const named = textIn(card, CHANNEL);
        if(named || !card)
            return named;

        // The channel is always linked, whatever the element around it is called, so a
        // link out to a channel is the one part of a card that cannot be renamed away.
        for(const element of card.querySelectorAll('a[href]')){
            const link = element as HTMLAnchorElement;
            if(!/^\/(@|channel\/|c\/|user\/)/.test(link.pathname))
                continue;

            const text = tidy(link.textContent);
            if(text)
                return text;
        }

        return "";
    }
    function durationOf(card: Element | null){
        // Taken as printed rather than matched against a clock, so 'LIVE' survives.
        const badge = textIn(card, DURATION);
        if(badge || !card)
            return badge;

        // Fallback for a renamed badge: a leaf whose whole text is a timestamp.
        for(const element of card.querySelectorAll('span, div')){
            if(element.children.length)
                continue;

            const text = tidy(element.textContent);
            if(TIMESTAMP.test(text))
                return text;
        }

        return "";
    }
    function publishedOf(card: Element | null){
        if(!card)
            return "";

        // Search and sidebar: a metadata line ending in the age, after the view count.
        // One span alone is the view count, so it is left rather than guessed at.
        const spans = card.querySelectorAll('#metadata-line span');
        if(spans.length >= 2){
            const text = tidy(spans[spans.length - 1].textContent);
            if(text)
                return text;
        }

        // Lockups: one row per line, the age last in the row that carries a separator.
        for(const row of card.querySelectorAll('.yt-content-metadata-view-model-wiz__metadata-text')){
            const parts = tidy(row.textContent).split('·');
            if(parts.length < 2)
                continue;

            const last = parts[parts.length - 1].trim();
            if(last)
                return last;
        }

        return "";
    }

    // Kept by id, because one video is usually two links — its thumbnail and its
    // title — and each of them may be the one sitting inside the richer card.
    const byId = new Map<string, PageVideo>();
    const seen = new Set<string>();
    let total = 0;

    // YouTube navigates within one document and leaves the page it came from in the DOM,
    // hidden. Its links still answer every query, and they come first in DOM order, so
    // the page that was navigated away from has to be excluded or a search's results
    // queue up behind the entire previous feed — and past the cut-off they are dropped
    // outright. The hidden attribute is how YouTube parks it, so that is the first cut.
    const found: { anchor: HTMLAnchorElement, id: string, isShort: boolean }[] = [];
    for(const element of document.querySelectorAll('a[href]')){
        const anchor = element as HTMLAnchorElement;
        const { id, isShort } = videoIdOf(anchor);
        // Tested before visibility because most links are not videos, and this is only
        // a URL parse where the check below is a layout read.
        if(!id || anchor.closest('[hidden]') !== null)
            continue;

        found.push({ anchor, id, isShort });
    }

    // Layout is the surer test of what is really on screen, but a tab that has never been
    // rendered reports no offsetParent for anything — so it is only trusted as a filter
    // once something has answered with one. Otherwise the whole list would come back
    // empty, which is worse than including a page that is merely parked.
    const laidOut = found.some(({ anchor }) => anchor.offsetParent !== null);

    for(const { anchor, id, isShort } of found){
        if(laidOut && anchor.offsetParent === null)
            continue;

        const card = anchor.closest(CARD);
        const found: PageVideo = {
            videoId: id,
            // Normalised to /watch, which plays shorts too, so one shape opens both.
            url: 'https://www.youtube.com/watch?v=' + id,
            // The card's own title element comes before the link's aria-label, which on
            // a thumbnail link is sometimes the title with the channel, views and age
            // appended — readable to a screen reader, noise in a row this size.
            title: tidy(anchor.getAttribute('title'))
                || textIn(card, TITLE)
                || tidy(anchor.textContent)
                || tidy(anchor.getAttribute('aria-label')),
            channel: channelOf(card),
            duration: durationOf(card),
            published: publishedOf(card),
            isShort
        };

        const existing = byId.get(id);
        if(existing){
            // The thumbnail link comes first and carries no text; the title link often
            // sits in a different part of the card. So the entry takes the best of both
            // rather than whichever happened to come first.
            if(!existing.title) existing.title = found.title;
            if(!existing.channel) existing.channel = found.channel;
            if(!existing.duration) existing.duration = found.duration;
            if(!existing.published) existing.published = found.published;
            continue;
        }
        if(seen.has(id))
            continue;

        // Counted before the cut-off, so the list can say what it is not showing.
        seen.add(id);
        total++;
        if(byId.size < MAX)
            byId.set(id, found);
    }

    return {
        videos: [...byId.values()],
        total,
        query: new URLSearchParams(location.search).get('search_query') ?? ""
    };
}
