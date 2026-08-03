import { useState, useEffect } from 'react';
import './Popup.css';
import TabView from '../components/TabView';
import MusicTabView from '../components/MusicTabView';

const Popup = () => {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [loaded, setLoaded] = useState(false);
  function queryTabs(){
    chrome.tabs.query({}, (chromeTabs) => {
      setTabs(chromeTabs.filter(x => x.url?.includes("youtube.com")));
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
      if(changeInfo.title)
        resetTabs();
    });
    chrome.tabs.onRemoved.addListener(() => {
      resetTabs();
    });
  }, []);
  return (
    <div className="all-tabs-view">{
      loaded && tabs.length == 0
        ? (<div className="empty-view">No YouTube tabs open.</div>)
        : tabs.map((tab) => (tab.url?.includes('music')
            ? (<MusicTabView key={tab.id} tab={tab}/>)
            : (<TabView key={tab.id} tab={tab}/>)))
    }</div>
  );
};

export default Popup;
