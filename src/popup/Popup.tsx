import { useState, useEffect, useRef } from 'react';
import './Popup.css';
import TabView from '../components/TabView';
import MusicTabView from '../components/MusicTabView';
import TabInfoView from '../components/TabInfoView';
import classifyTab, { unloadedReason, tabUrl } from '../lib/tabState';
import type { NoPlayerReason } from '../lib/tabState';
import { probePageInTab } from '../lib/pageProbe';
import type { PageProbe } from '../lib/pageProbe';
import runScript from '../lib/runScript';
import TabVideosView from '../components/TabVideosView';

const Popup = () => {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [probes, setProbes] = useState<Record<number, PageProbe>>({});
  const [loaded, setLoaded] = useState(false);
  // Which tab the popup has drilled into, or null for the list. This is navigation
  // inside the popup only — the browser stays on whatever tab it was on.
  const [openTabId, setOpenTabId] = useState<number | null>(null);
  // The probe loop reads the tab list through a ref so that re-reading the tabs
  // does not tear down and rebuild the interval.
  const tabsRef = useRef<chrome.tabs.Tab[]>([]);
  tabsRef.current = tabs;

  function queryTabs(){
    chrome.tabs.query({}, (chromeTabs) => {
      setTabs(chromeTabs.filter(x => tabUrl(x).includes("youtube.com")));
      setLoaded(true);
    });
  }
  function resetTabs(){
    // Titles lag behind the event, so re-read for a while. The list is keyed by
    // tab id, so this reconciles in place instead of remounting every card.
    const interval = setInterval(queryTabs, 100);
      setTimeout(() => {
        clearInterval(interval);
      }, 2000);
  }
  useEffect(() => {
    queryTabs();
    chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
      // A tab crossing between the groups reports no title change, so the
      // lifecycle fields have to be watched as well.
      if(changeInfo.title || changeInfo.status
          || changeInfo.discarded !== undefined || changeInfo.frozen !== undefined)
        resetTabs();
    });
    chrome.tabs.onRemoved.addListener(() => {
      resetTabs();
    });
  }, []);

  // Whether a tab has a live player can only be answered by the page itself, so
  // every reachable tab is probed on its own cadence. Keyed on the set of tab ids
  // rather than the array, so the 100ms burst in resetTabs does not restart it.
  const tabIds = tabs.map(tab => tab.id).join(',');
  useEffect(() => {
    function probeTabs(){
      for(const tab of tabsRef.current){
        const id = tab.id;
        // A tab Chrome unloaded cannot be probed at all, and does not need to be:
        // its reason already comes from the tab fields.
        if(id === undefined || unloadedReason(tab))
          continue;

        runScript(tab, probePageInTab, (probe) => {
          setProbes((prev) => {
            const old = prev[id];
            // Same answer as last tick, so keep the identity and skip the render.
            if(old && old.hasVideo === probe.hasVideo && old.ready === probe.ready)
              return prev;

            return { ...prev, [id]: probe };
          });
        });
      }
    }
    probeTabs();
    const interval = setInterval(probeTabs, 1000);
    return () => clearInterval(interval);
  }, [tabIds]);

  const playable: chrome.tabs.Tab[] = [];
  const inactive: { tab: chrome.tabs.Tab, reason: NoPlayerReason }[] = [];
  const noMedia: chrome.tabs.Tab[] = [];
  for(const tab of tabs){
    const cls = classifyTab(tab, probes[tab.id ?? -1]);
    if(cls.kind === 'playable')
      playable.push(tab);
    else if(cls.kind === 'no-player'){
      // A page with nothing playing is not asleep, it just has no player, so it
      // gets its own group and a card that does not read as inactive.
      if(cls.reason === 'no-media')
        noMedia.push(tab);
      else
        inactive.push({ tab, reason: cls.reason });
    }
    // 'unknown' is held back until the first probe answers, so a tab never flashes
    // as a full card before dropping into one of the groups below.
  }

  // The open tab is resolved from the live list rather than copied into state, so the
  // screen keeps following the tab as the poll refreshes it. It comes back undefined
  // once the tab is closed, which the screen reports instead of the popup going blank.
  if(openTabId !== null){
    const openTab = tabs.find(tab => tab.id === openTabId);
    return (<TabVideosView tab={openTab} onBack={() => setOpenTabId(null)}/>);
  }

  return (
    <div className="all-tabs-view">
      {
        loaded && tabs.length == 0 &&
        <div className="empty-view">No YouTube tabs open.</div>
      }
      {
        playable.map((tab) => (tabUrl(tab).includes('music')
          ? (<MusicTabView key={tab.id} tab={tab}/>)
          : (<TabView key={tab.id} tab={tab}/>)))
      }
      {
        inactive.length > 0 &&
        <div className="tab-group-header">Inactive</div>
      }
      {
        inactive.map(({ tab, reason }) => (<TabInfoView key={tab.id} tab={tab} reason={reason}/>))
      }
      {
        noMedia.length > 0 &&
        <div className="tab-group-header">No media</div>
      }
      {
        // These pages have no player to control, but they do list videos, so the card
        // opens a screen of its own showing them.
        noMedia.map((tab) => {
          const id = tab.id;
          return (
            <TabInfoView
              key={id}
              tab={tab}
              reason="no-media"
              variant="plain"
              // A tab with no id cannot be looked up again, so it stays a plain card.
              onOpen={id === undefined ? undefined : () => setOpenTabId(id)}
            />
          );
        })
      }
    </div>
  );
};

export default Popup;
