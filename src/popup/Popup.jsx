import React, { useState, useEffect } from 'react';
import './Popup.css';
import TabView from '../components/TabView';
import MusicTabView from '../components/MusicTabView';

const Popup = () => {
  const [tabs, setTabs] = useState([]);
  function resetTabs(){
    setTabs([]);
    let interval = setInterval(() => {
        chrome.tabs.query({}, (chromeTabs) => setTabs(chromeTabs.filter(x => x.url.includes("youtube.com"))));
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
      }, 2000);
  }
  useEffect(() => {
    chrome.tabs.query({}, (chromeTabs) => setTabs(chromeTabs.filter(x => x.url.includes("youtube.com"))));
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if(changeInfo.title)
        resetTabs();
    });
    chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
      resetTabs();
    });
  }, []);
  return (
    <div class="all-tabs-view">{
      tabs.map((tab, idx) => (tab.url.includes('music') ? (<MusicTabView tab={tab}/>) : (<TabView tab={tab}/>)))
    }</div>
  );
};

export default Popup;