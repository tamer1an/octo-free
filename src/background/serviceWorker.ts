/// <reference types="chrome"/>

chrome.runtime.onInstalled.addListener(() => {
  console.log('Octo-Free React Extension Installed');
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
});
