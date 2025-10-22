// Background script (service worker)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extensão instalada!');
});

// Listener para mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'LOG_ACTION') {
    console.log('Ação registrada:', request.data);
  }
});

// Exemplo de listener para abas
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Página carregada:', tab.url);
  }
});