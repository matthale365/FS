// Background service worker for FamilySearch Helper
// Currently minimal - can be expanded for future features

chrome.runtime.onInstalled.addListener(() => {
  console.log('FamilySearch Indexing Helper installed');
  
  // Set default settings
  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({
        settings: {
          autoFilter: true,
          autoExtract: true,
          autoFill: true
        }
      });
    }
  });
});