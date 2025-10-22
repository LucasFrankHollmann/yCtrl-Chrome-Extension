import React, { useState, useEffect } from 'react';
import './Popup.css';
import TabView from '../components/TabView';

const Popup = () => {
  const [tabs, setTabs] = useState([]);
  useEffect(() => {
    chrome.tabs.query({}, (tabs) => setTabs(tabs.filter(x => x.url.includes("www.youtube.com"))));
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if(changeInfo.title)
        chrome.tabs.query({}, (tabs) => setTabs(tabs.filter(x => x.url.includes("www.youtube.com"))));
    });
    chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
      chrome.tabs.query({}, (tabs) => setTabs(tabs.filter(x => x.url.includes("www.youtube.com"))));
    });
  }, []);

  return (
    <div class="all-tabs-view">{
      tabs.map((tab, idx) => (<TabView tab={tab}/>))
    }</div>
  );
};

export default Popup;