/** Coarse "how long ago" label for a tab's `lastAccessed` timestamp. */
export default function formatSince(timestamp: number){
    const minutes = Math.floor((Date.now() - timestamp) / 60000);

    if(minutes < 1)
        return "just now";
    if(minutes < 60)
        return minutes + "m ago";

    const hours = Math.floor(minutes / 60);
    if(hours < 24)
        return hours + "h ago";

    return Math.floor(hours / 24) + "d ago";
}
