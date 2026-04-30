chrome.runtime.onInstalled.addListener(()=>{console.log("Octo-Free React Extension Installed")});chrome.runtime.onMessage.addListener(e=>{e.action==="openOptions"&&chrome.runtime.openOptionsPage()});
