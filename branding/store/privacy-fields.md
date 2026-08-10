# Chrome Web Store — Privacy tab answers (ytOverseer)

Paste-ready text for each field of the dashboard's Privacy practices tab.

---

## 1. Single purpose

```
ytOverseer has one purpose: to control media playback in the user's open YouTube tabs from the extension's popup.

The popup lists every open youtube.com and music.youtube.com tab and, for each one, offers play/pause, seek, skip to the previous or next video, jump 15 seconds, volume and mute, playback speed, and picture-in-picture. Where a tab has no player to control, the same popup reports why and can list the videos that tab's page is showing so that one of them can be opened and then controlled. Every feature serves controlling or reaching YouTube playback, and the extension runs on no other site.
```

---

## 2. Permission justifications

### `tabs`

```
The popup's purpose is to show every open YouTube tab in one list, so it has to enumerate the user's tabs and read each tab's URL and title to decide which ones are YouTube or YouTube Music. The URL is also what tells a video page apart from a browsing page, which decides whether a tab gets playback controls or is reported as having no player. The title is what labels each card so the user can tell the tabs apart. The permission is further used to close a tab on the user's click, and to open a chosen video in a background tab.

Tab data is read only while the popup is open, used only to render it, and is never stored or transmitted anywhere.
```

### `scripting`

```
The player and its state live inside the page, and no extension API can reach a page's <video> element. Running a function in the YouTube tab is therefore the only way to read elapsed time, duration, paused state, volume and playback rate, and the only way to apply the user's changes to them.

The same mechanism performs every other action the popup offers: requesting picture-in-picture, clicking the page's own previous/next buttons so YouTube advances its playlist correctly, typing into and submitting the page's own search box, clicking the YouTube logo to go home, capturing the current video frame for the in-popup preview, and reading the list of videos the page displays.

Functions are injected only into youtube.com and music.youtube.com tabs, and only while the popup is open or in response to a user action.
```

### Host permissions — `https://www.youtube.com/*`, `https://music.youtube.com/*`

Written to stand alone: the dashboard shows each justification on its own, so it
names its hosts and its reasons without leaning on the `scripting` answer.

```
ytOverseer controls media playback in the user's YouTube tabs, so it requests access to the two sites that serve those tabs and to nothing else: https://www.youtube.com/* and https://music.youtube.com/*.

Access to these hosts is required to run the extension's own functions inside a YouTube tab, which is the only way to reach the page's <video> element. That is what lets the popup read the player's elapsed time, duration, paused state, volume and playback rate, and apply the user's changes to them: play and pause, seek, jump 15 seconds, volume and mute, playback speed, and picture-in-picture. It is also what lets the popup click the page's own previous and next buttons so YouTube advances its playlist correctly, submit a search through the page's own search box, capture the current video frame for the in-popup preview, and read the list of videos the page is displaying.

No broader host pattern is requested and no other domain is listed, so the extension is unable to run on any site other than these two.
```

---

## 3. Are you using remote code?

**Answer: No, I am not using remote code.**

If a justification box appears:

```
All executable code ships inside the extension package. The functions injected into pages are part of the bundle, not fetched at runtime, and the extension loads no remote script, module or eval'd string. The only network requests made are for video thumbnail images, which the browser loads directly from YouTube's own image host (i.ytimg.com) when the video list is shown.
```

---

## 4. Data usage

Check exactly these two:

- [x] **Web history** — the extension reads the URL and title of open tabs to find the YouTube ones and to classify them.
- [x] **Website content** — it reads player state and, on the video list, the titles, channels, durations and links the page displays; the preview feature captures the current video frame.

Leave unchecked: personally identifiable information, health, financial and
payment, authentication, personal communications, location, user activity.

> Why check anything at all when nothing is transmitted: the policy requires
> disclosure "even when data is processed or stored locally on a user's device and
> is not transmitted to external servers or third parties", and defines "handle" as
> "collecting, transmitting, using, or sharing user data". Reviewers cross-check
> these boxes against what the code does — `tabs` plainly reads URLs, and
> `listVideosInTab` plainly reads page content, so declaring neither would read as
> an under-declaration.
>
> **User activity** stays unchecked deliberately: that category is network
> monitoring, clicks, mouse position, scrolling and keystroke logging. The
> extension records none of those. Reacting to the user's own click on its own
> popup button is not activity monitoring.

### The three certifications

Check all three. Each is true:

- **I do not sell or transfer user data to third parties, outside of the approved use cases** — nothing is transferred at all.
- **I do not use or transfer user data for purposes that are unrelated to my item's single purpose** — tab and page data is used only to render the popup and drive playback.
- **I do not use or transfer user data to determine creditworthiness or for lending purposes** — no.

---

## 5. Privacy policy

Required, because the two boxes above mean the extension handles user data.

`PRIVACY.md` is in the repository root. Paste this URL into the field:

```
https://github.com/LucasFrankHollmann/yCtrl-Chrome-Extension/blob/main/PRIVACY.md
```

It has to be publicly reachable and stay reachable — a dead privacy policy link
is grounds for takedown. If the repository is ever renamed or made private,
update the field.

---

## Two things to watch

**The single purpose field is where the video list and search are most exposed.**
A reviewer could read "search YouTube and list a page's videos" as a second
purpose beside "control playback". The wording above subordinates it on purpose:
the list exists so a tab with nothing playing can be given something to play. If
review pushes back on single purpose, that feature is the one to defend or drop —
not the playback controls.

**The listing description has to agree with these boxes.** A public description
claiming "collects nothing" beside a disclosure checking Web history is a
contradiction a reviewer will see. `listing.md` has been corrected accordingly.
