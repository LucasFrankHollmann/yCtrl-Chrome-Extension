# Privacy Policy — ytOverseer

**Last updated: 10 August 2026**

ytOverseer is a Chrome extension that controls media playback in your open
YouTube tabs. This policy describes every piece of data it touches and what
happens to it.

## The short version

ytOverseer has no account, no analytics, no tracking and no server. Nothing it
reads is stored, and nothing is ever sent to the developer or to any third party.
The data described below exists only in the extension's memory, only while its
popup is open, and is discarded when the popup closes.

## What the extension reads

**Your open tabs.** To list your YouTube tabs in one panel, the extension reads
the list of your open tabs and, for each one, its URL and title. The URL is what
identifies a tab as YouTube or YouTube Music and tells a video page apart from a
browsing page; the title is what labels each card so you can tell your tabs
apart. Tabs that are not YouTube are ignored and never leave the extension.

**Playback state of YouTube pages.** For a YouTube tab, the extension reads the
current time, duration, paused state, volume, mute state and playback speed of
the page's video, so the popup can show them and change them at your request.

**Content shown by YouTube pages.** When you open the video list for a tab, the
extension reads the videos that page is displaying — their titles, channels,
durations, ages and links — so it can list them. When you turn on the preview,
it captures the current frame of the video to draw it inside the popup.

Nothing else on a page is read, and no other website is accessed. The extension
requests access to `youtube.com` and `music.youtube.com` only, so your browser
would refuse to run it anywhere else.

## What is stored

Nothing. The extension writes no files, sets no cookies, and uses no storage API
— not `chrome.storage`, not `localStorage`, not IndexedDB. Closing the popup
discards everything it had read. Your volume and speed changes are applied to the
page itself and live only as long as that page does.

## What leaves your computer

No data is transmitted to the developer or to any third party. The extension has
no backend to send anything to.

There is one network request worth naming, for completeness: when the video list
is shown, your browser loads each video's thumbnail image from YouTube's own
image host (`i.ytimg.com`), exactly as the YouTube page itself would. That
request is made by the browser directly to Google and contains no data the
extension added.

## Permissions

- **`tabs`** — to list your tabs and read their URLs and titles, so the popup can
  find and label your YouTube tabs. Chrome describes this permission as reading
  your browsing history, which is why it is stated plainly here.
- **`scripting`** — to run the extension's own functions inside YouTube tabs.
  This is the only way an extension can read or control a page's video.
- **`https://www.youtube.com/*` and `https://music.youtube.com/*`** — the only
  sites the extension may run on.

## Data sold or shared

None. No user data is sold, transferred or shared with anyone. No user data is
used for creditworthiness or lending purposes, or for any purpose unrelated to
controlling playback in your YouTube tabs.

## Children

The extension is not directed at children and collects no data from anyone.

## Changes

If this policy changes, the updated version will be published at this URL and the
date above will be revised.

## Contact

Questions about this policy, or about the extension's handling of data, can be
raised as an issue at
<https://github.com/LucasFrankHollmann/yCtrl-Chrome-Extension/issues>.

---

ytOverseer is not affiliated with, endorsed by, or sponsored by YouTube or
Google. YouTube is a trademark of Google LLC.
