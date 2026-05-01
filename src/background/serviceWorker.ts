/// <reference types="chrome"/>

chrome.runtime.onInstalled.addListener(() => {
  console.log('Github File Tree (Octofree) Extension Installed');
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
});
