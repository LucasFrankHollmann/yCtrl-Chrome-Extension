# Chrome Web Store listing copy — ytOverseer

Everything below is ready to paste. The detailed description is **plain text**: the
store strips HTML and does not render Markdown, so it uses blank lines and `•`
bullets rather than headings.

---

## Short description (manifest `description`, max 132 characters)

Recommended, 114 characters:

```
Control every YouTube tab from one popup: volume boost to 500%, playback speed, picture-in-picture, seek and mute.
```

Currently shipping, 111 characters:

```
Control YouTube playback across all your tabs: play/pause, volume, speed and picture-in-picture from one popup.
```

The recommended one adds the three phrases people actually type into the store
search — "volume boost", "500%", "mute" — without losing the sentence.

---

## Detailed description (max 16,000 characters)

```
Control every YouTube tab you have open from a single popup. See what is playing, find the tab making noise, and change volume, playback speed or position without switching away from what you are doing.

ytOverseer lists every YouTube and YouTube Music tab in one panel and gives each one its own set of controls. No shortcuts to memorise, no settings to configure — open the popup and everything is there.

WHAT YOU CAN DO

• Play or pause any tab, and jump 15 seconds backward or forward
• Skip to the previous or next video, driving YouTube's own player buttons
• Drag the seek bar to move anywhere in a video, with elapsed and total time shown
• Set volume per tab, and boost it up to 500% for videos recorded too quietly
• Mute a single tab with one click, instead of hunting for the tab making the sound
• Change playback speed up to 5x in 0.1 steps, and click the number to snap back to 1x
• Send any video to picture-in-picture, including pages that try to block it
• Preview the live frame of a video inside the popup, without switching tabs
• Close a tab straight from the list

VOLUME BOOST ABOVE 100%

A video element caps out at 100%, so anything louder has to be routed through the browser's audio graph. ytOverseer builds that graph on demand and uses it as the volume source, which is what makes 500% possible. Quiet lectures, old uploads and phone recordings become listenable without touching your system mixer.

PLAYBACK SPEED, PER TAB

Speed is set on each tab independently, so a tutorial can run at 2x while music plays at normal speed in another tab. Step by 0.1, drag the slider, or click the number to return to 1x.

YOUTUBE MUSIC SUPPORT

YouTube Music tabs get their own card, with transport wired to the Music player bar rather than a bare video element — so skipping a track really advances the queue instead of ending the audio.

TABS CHROME PUT TO SLEEP

Chrome unloads background tabs to free memory, and an unloaded tab has no player to control. Rather than showing dead buttons, ytOverseer says exactly why a tab cannot be driven — unloaded, frozen, never opened, or loaded but not playing — and offers to wake it. Waking shows the tab just long enough for its player to load, then hands the focus straight back to where you were.

BROWSE AND SEARCH WITHOUT LEAVING YOUR TAB

For a YouTube page with nothing playing, the card opens a list of every video that page is showing, with title, channel, length and age. Click a row and it opens in a background tab next to its source, so you can queue up several without losing your place.

You can also search YouTube from inside the popup. The query is typed into the page's own search box and submitted, so YouTube navigates itself and keeps its history and app state intact — and "home" clicks the real YouTube logo rather than pointing the tab at a URL.

WHAT IT IS GOOD FOR

• Finding which of twenty tabs is playing audio, and silencing just that one
• Watching a long talk at 1.75x while music runs somewhere else
• Turning up a quiet recording past what YouTube itself allows
• Keeping a video visible in picture-in-picture while you work in another window
• Pausing everything before a call, from one place

PRIVACY

No account, no analytics, no tracking, and no server — the extension has no backend to send anything to. Nothing it reads is stored: it uses no storage API at all, and closing the popup discards everything.

To list your YouTube tabs, it reads your open tabs and their titles, and on a YouTube page it reads the player's state and the videos that page displays. That is what the data disclosure on this page declares, and it stays on your computer: none of it is transmitted to the developer or to anyone else.

The extension requests access to youtube.com and music.youtube.com only, so your browser would refuse to run it on any other site.

PERMISSIONS, AND WHY

• Tabs — to list your open tabs and tell which of them are YouTube. This is what lets one popup show every player at once.
• Scripting — to read the player's state (time, volume, speed) and apply your changes to it. There is no other way for an extension to reach a page's video element.
• youtube.com and music.youtube.com — the only sites the extension is allowed to run on.

ytOverseer is not affiliated with, endorsed by, or sponsored by YouTube or Google. YouTube is a trademark of Google LLC.

Found a bug or want a control that is missing? Reports are welcome and get read.
```

---

## SEO notes

**The name carries almost no search weight.** "ytOverseer" is not a term anyone
searches, and "yt" attracts far less traffic than "youtube". So the short
description is doing the discovery work, which is why it leads with "YouTube"
and names the three features with real search volume.

**Front-loaded first paragraph.** The store truncates the detailed description
behind a "read more" fold, and only the opening lines show. That first paragraph
is written to stand alone and contains the primary phrases: control YouTube tab,
volume, playback speed.

**Phrases targeted deliberately**, each appearing in natural sentences rather
than a keyword list: youtube volume booster, volume boost 500%, youtube playback
speed, youtube picture in picture, mute youtube tab, which tab is playing audio,
youtube music controls, control youtube from another tab.

**No keyword stuffing.** Chrome Web Store policy prohibits repetitive or
irrelevant keywords, and it is enforced at review. Every phrase above appears
where it makes sense and no more than a couple of times.

**"What it is good for" exists for search, not for you.** People search by
problem, not by feature name — "find tab playing sound" is a real query. That
block converts features into the phrasing people type.

**The privacy block is a conversion tool.** The install prompt says this
extension can "read your browsing history", which is how Chrome describes the
tabs permission. Stating plainly, above the fold of the permissions dialog's
scare, that nothing is collected and no other site can be touched, is what keeps
that prompt from ending the install.

**Disclaimer is not optional.** Any listing positioning itself around YouTube
needs the non-affiliation line, and its absence is a known rejection reason.
