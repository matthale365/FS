// ========================================
// LOAD CURRENT SETTINGS
// ========================================
chrome.storage.sync.get(['settings'], (result) => {
  const settings = result.settings || {
    autoFilter: false,
    autoExtract: false,
    autoFill: false,
    autoWorkflow: false
  };
  
  document.getElementById('autoFilter').checked = settings.autoFilter;
  document.getElementById('autoExtract').checked = settings.autoExtract;
  document.getElementById('autoFill').checked = settings.autoFill;
  document.getElementById('autoWorkflow').checked = settings.autoWorkflow;
});

// ========================================
// SAVE SETTINGS FUNCTION
// ========================================
function saveSettings() {
  const settings = {
    autoFilter: document.getElementById('autoFilter').checked,
    autoExtract: document.getElementById('autoExtract').checked,
    autoFill: document.getElementById('autoFill').checked,
    autoWorkflow: document.getElementById('autoWorkflow').checked
  };
  
  chrome.storage.sync.set({ settings }, () => {
    showStatus('Settings saved');
  });
}

// ========================================
// SETTING CHANGE LISTENERS
// ========================================
document.getElementById('autoFilter').addEventListener('change', saveSettings);
document.getElementById('autoExtract').addEventListener('change', saveSettings);
document.getElementById('autoFill').addEventListener('change', saveSettings);
document.getElementById('autoWorkflow').addEventListener('change', saveSettings);


// ========================================
// MANUAL ACTION BUTTONS
// ========================================

// Run Filter Button
document.getElementById('runFilter').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      showStatus('No active tab', true);
      return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, { action: 'runFilter' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showStatus('Failed - reload page', true);
        return;
      }
      
      if (response && response.success) {
        showStatus('Filter applied');
      } else {
        showStatus('Filter failed', true);
      }
    });
  });
});

// Run Extract Button
document.getElementById('runExtract').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      showStatus('No active tab', true);
      return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, { action: 'runExtract' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showStatus('Failed - reload page', true);
        return;
      }
      
      if (response && response.success) {
        showStatus('Data extracted');
      } else {
        showStatus('Extract failed', true);
      }
    });
  });
});

// Run Fill Button
document.getElementById('runFill').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      showStatus('No active tab', true);
      return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, { action: 'runAutoFill' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showStatus('Failed - reload page', true);
        return;
      }
      
      if (response && response.success) {
        showStatus('Form filled');
      } else {
        showStatus('Fill failed', true);
      }
    });
  });
});

// Auto Find Person Button
document.getElementById('autoFind').addEventListener('click', async () => {
  let personId;
  
  try {
    // Try to read clipboard
    personId = await navigator.clipboard.readText();
    
    if (!personId || personId.trim() === "") {
      showStatus('Clipboard is empty', true);
      return;
    }
    
    const cleanId = personId.trim();
    
    // Validate format: XXXX-XXX (4 chars, dash, 3 chars) - can be letters/numbers
    const idPattern = /^[A-Z0-9]{4}-[A-Z0-9]{3}$/i;
    
    if (!idPattern.test(cleanId)) {
      showStatus('Invalid ID format (XXXX-XXX)', true);
      return;
    }
    
    // Open the person's profile in the current tab
    const url = `https://www.familysearch.org/en/tree/person/details/${encodeURIComponent(cleanId)}`;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.update(tabs[0].id, { url: url });
        showStatus(`Opening ${cleanId}...`);
        
        // Close popup after a short delay
        setTimeout(() => window.close(), 500);
      }
    });
    
  } catch (error) {
    console.error('Clipboard error:', error);
    showStatus('Clipboard access denied', true);
  }
});


// ========================================
// STATUS MESSAGE FUNCTION
// ========================================
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.color = isError ? '#dc2626' : '#059669';
  
  setTimeout(() => {
    status.textContent = 'Ready';
    status.style.color = '#6b7280';
  }, 3000);
}

// ========================================
// INITIALIZE - CHECK CURRENT TAB STATUS
// ========================================
// Optional: Update UI based on whether current tab is FamilySearch
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    const isFamilySearch = tabs[0].url?.includes('familysearch.org');
    
    // You could disable buttons if not on FamilySearch
    if (!isFamilySearch) {
      const buttons = ['runFilter', 'runExtract', 'runFill'];
      buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.style.opacity = '0.5';
          btn.title = 'Only works on FamilySearch.org';
        }
      });
    }
  }
});