chrome.runtime.onInstalled.addListener(() => {
  console.log('Xbinder: Extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes('x.com') || tab.url.includes('twitter.com')) {
    chrome.action.openPopup();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      (tab.url?.includes('x.com') || tab.url?.includes('twitter.com'))) {
    console.log('Xbinder: X.com/Twitter tab loaded');
  }
});