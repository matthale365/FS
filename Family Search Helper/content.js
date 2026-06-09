// ========================================
// TIMING CONFIGURATION
// ========================================
const TIMING = {
  FIELD_DELAY: 50,
  DATE_FOCUS_DELAY: 100,
  DATE_TRIGGER_DELAY: 100,
  AUTOCOMPLETE_CHECK: 200,
  AUTOCOMPLETE_CLICK_DELAY: 200,
  AUTOCOMPLETE_TIMEOUT: 30,
  WORKFLOW_COUNTDOWN: 3  // Seconds before auto-action executes (NUMIDENT workflow)
};

// ========================================
// NOTIFICATION SYSTEM
// ========================================
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.textContent = message;

  const colors = { success: '#10b981', info: '#3b82f6', warning: '#f59e0b' };

  notification.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    background: ${colors[type] || colors.success};
    color: white; padding: 12px 20px; border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    font-size: 13px; font-weight: 500; z-index: 10000;
    opacity: 0; transition: opacity 0.3s ease;
  `;

  document.body.appendChild(notification);
  setTimeout(() => notification.style.opacity = '1', 10);
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showCountdownNotification(message, seconds, callback) {
  const notification = document.createElement('div');
  const messageSpan = document.createElement('div');
  const cancelButton = document.createElement('button');
  let remaining = seconds;
  let cancelled = false;
  let interval;

  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: #3b82f6; color: white;
    padding: 16px 24px; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-size: 14px; font-weight: 600; z-index: 10000;
    min-width: 300px; text-align: center;
    display: flex; flex-direction: column; gap: 12px;
  `;

  messageSpan.style.cssText = `font-size: 14px;`;

  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white; padding: 6px 16px; border-radius: 4px;
    cursor: pointer; font-size: 13px; font-weight: 600;
    transition: background 0.2s;
  `;

  cancelButton.onmouseover = () => { cancelButton.style.background = 'rgba(255, 255, 255, 0.3)'; };
  cancelButton.onmouseout  = () => { cancelButton.style.background = 'rgba(255, 255, 255, 0.2)'; };

  cancelButton.onclick = () => {
    cancelled = true;
    clearInterval(interval);
    notification.remove();
    showNotification("✗ Action cancelled", 'info');
  };

  const updateText = () => { messageSpan.textContent = `${message} (${remaining}s)`; };

  updateText();
  notification.appendChild(messageSpan);
  notification.appendChild(cancelButton);
  document.body.appendChild(notification);

  interval = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      updateText();
    } else {
      clearInterval(interval);
      notification.remove();
      if (callback && !cancelled) callback();
    }
  }, 1000);
}

// ========================================
// SETTINGS & INITIALIZATION
// ========================================
let settings = { autoFilter: false, autoExtract: false, autoFill: false, autoWorkflow: false };

chrome.storage.sync.get(['settings'], (result) => {
  if (result.settings) settings = { ...settings, ...result.settings };
  console.log("📋 Settings loaded:", settings);
  init();
});

chrome.storage.onChanged.addListener((changes) => {
  if (!changes.settings) return;

  const oldSettings = settings;
  settings = { ...settings, ...changes.settings.newValue };

  const url = location.href;

  // If autoFilter was just turned ON
  if (!oldSettings.autoFilter && settings.autoFilter) {
    if (url.includes("familysearch.org/en/search/record/")) {
      console.log("🔄 Auto Filter enabled - running filter...");
      runFilterAction();
    }
  }

  // If autoExtract was just turned ON
  if (!oldSettings.autoExtract && settings.autoExtract) {
    if (url.includes("familysearch.org/ark:/")) {
      console.log("🔄 Auto Extract enabled - extracting data...");
      extractFamilySearchData();
    } else if (url.includes("ancestry.com/family-tree/person/tree") ||
               url.includes("ancestryinstitution.com/family-tree/person/tree")) {
      console.log("🔄 Auto Extract enabled - extracting data...");
      extractAncestryData();
    } else if (url.includes("findagrave.com/memorial/")) {
      console.log("🔄 Auto Extract enabled - extracting data...");
      extractFindAGraveData();
    }
  }

  // If autoFill was just turned ON — fill immediately if the popup is already open
  if (!oldSettings.autoFill && settings.autoFill) {
    const openDialog = Array.from(document.querySelectorAll('[role="dialog"]')).find(d =>
      d.querySelector('input[data-testid="first-name"]') &&
      d.querySelector('input[data-testid="last-name"]') &&
      d.querySelector('input[name="birthDate"]')
    );
    if (openDialog) {
      console.log("🔄 Auto Fill enabled - filling open popup...");
      fillPersonForm(true);
    }
  }

  // If autoWorkflow was just turned ON
  if (!oldSettings.autoWorkflow && settings.autoWorkflow) {
    if (url.includes("familysearch.org/ark:/")) {
      console.log("🔄 Auto Workflow enabled - detecting workflow...");
      detectAndHandleNumidentWorkflow();
    }
  }
});

function init() {
  const url = location.href;

  if (url.includes("familysearch.org/en/search/record/") && settings.autoFilter) {
    setupFilterObserver();
  }

  // NUMIDENT workflow handles its own extraction when needed
  if (url.includes("familysearch.org/ark:/") && settings.autoWorkflow) {
    detectAndHandleNumidentWorkflow();
  }

  if (settings.autoExtract) {
    if (url.includes("familysearch.org/ark:/")) waitForFamilySearchData();
    else if (url.includes("ancestry.com/family-tree/person/tree") ||
             url.includes("ancestryinstitution.com/family-tree/person/tree")) waitForAncestryData();
    else if (url.includes("findagrave.com/memorial/")) waitForFindAGraveData();
  }

  // Re-extract on tab refocus — only if autoExtract is ON at the time of focus
  if (url.includes("familysearch.org/ark:/")) {
    window.addEventListener('focus', () => { if (settings.autoExtract) extractFamilySearchData(); });
  } else if (url.includes("ancestry.com/family-tree/person/tree") ||
             url.includes("ancestryinstitution.com/family-tree/person/tree")) {
    window.addEventListener('focus', () => { if (settings.autoExtract) extractAncestryData(); });
  } else if (url.includes("findagrave.com/memorial/")) {
    window.addEventListener('focus', () => { if (settings.autoExtract) extractFindAGraveData(); });
  }

  if (url.includes("familysearch.org")) {
    setupFormFillObserver();
  }
}

// ── Message listener — manual popup buttons always bypass autoExtract/autoFill guards ──
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if      (request.action === 'runFilter')   runFilterAction();
  else if (request.action === 'runExtract')  runExtractForCurrentPage();
  else if (request.action === 'runAutoFill') fillPersonForm(true);
  sendResponse({ success: true });
  return true;
});

// ========================================
// NUMIDENT AUTO-WORKFLOW
// ========================================
function detectAndHandleNumidentWorkflow() {
  if (!settings.autoWorkflow) return;

  console.log("🔍 Checking NUMIDENT workflow...");

  setTimeout(() => {
    // ── Option 3: Definite match — "Possible Tree Match" + Attach button ──
    let attachButton = document.querySelector('a[data-testid="attachToFamilyTree-Button"]');

    if (!attachButton) {
      attachButton = Array.from(document.querySelectorAll('a, button')).find(btn =>
        btn.textContent.trim() === "Attach to Tree" && btn.offsetParent !== null
      );
    }

    const possibleTreeMatchHeader = Array.from(document.querySelectorAll('*')).find(el =>
      el.textContent.trim() === "Possible Tree Match" && el.offsetParent !== null
    );

    if (attachButton && possibleTreeMatchHeader) {
      console.log("✅ Option 3: Definite match - will click ATTACH TO TREE button");
      showCountdownNotification(
        "✓ Definite match found! Clicking ATTACH TO TREE...",
        TIMING.WORKFLOW_COUNTDOWN,
        () => {
          attachButton.click();
          showNotification("✓ Clicked attach button - redirecting...", 'success');
        }
      );
      return;
    }

    // ── Option 2: Already attached — "Attached To:" section ──
    const attachedToHeader = Array.from(document.querySelectorAll('*')).find(el =>
      el.textContent.trim() === "Attached To:" && el.offsetParent !== null
    );

    if (attachedToHeader) {
      console.log("✅ Option 2: Found 'Attached To:' - looking for person link and attach button");

      const parentSection = attachedToHeader.closest('div');
      let personLink = parentSection
        ? parentSection.querySelector('a[href*="/tree/person/"]')
        : null;

      if (!personLink) {
        const allPersonLinks = document.querySelectorAll('a[href*="/tree/person/"]');
        if (allPersonLinks.length > 0) personLink = allPersonLinks[0];
      }

      let attachBtn = document.querySelector('a[data-testid="attachToFamilyTree-Button"]');
      if (!attachBtn) {
        attachBtn = Array.from(document.querySelectorAll('a, button')).find(btn =>
          btn.textContent.trim() === "Attach to Tree" && btn.offsetParent !== null
        );
      }

      if (personLink) {
        const personId   = personLink.href.match(/\/tree\/person\/([^/?]+)/)?.[1];
        const personName = personLink.textContent.trim();

        if (personId) {
          showCountdownNotification(
            `⚠️ Attached to: ${personName}. Opening pages...`,
            TIMING.WORKFLOW_COUNTDOWN,
            () => {
              navigator.clipboard.writeText(personId).then(() => {
                showNotification(`✓ Copied ID: ${personId}`, 'info');
              }).catch(() => {
                console.log("Clipboard copy failed, continuing anyway");
              });

              if (attachBtn) {
                console.log("Clicking ATTACH TO TREE button...");
                attachBtn.click();
                showNotification("✓ Clicked attach button", 'success');
                setTimeout(() => {
                  window.open(`https://www.familysearch.org/tree/person/${personId}`, '_blank');
                  showNotification(`✓ Opened: ${personName}`, 'success');
                }, 1000);
              } else {
                window.open(`https://www.familysearch.org/tree/person/${personId}`, '_blank');
                showNotification(`✓ Opened: ${personName}`, 'success');
              }
            }
          );
          return;
        }
      }
    }

    // ── Option 1: No matches — extract data and prompt to create new person ──
    console.log("✅ Option 1: No matches found");
    waitForFamilySearchData();
    showCountdownNotification("ℹ️ No matches found. Create new person.", TIMING.WORKFLOW_COUNTDOWN);

  }, 2000);
}

// ========================================
// FILTER
// ========================================
function setupFilterObserver() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(runFilter, 3000));
  } else {
    setTimeout(runFilter, 3000);
  }

  let lastRowCount = 0, lastDataCount = 0, stableChecks = 0, checkTimeout;
  let lastUrl = location.href;

  const observer = new MutationObserver((mutations) => {
    let rowsAdded = false;

    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      setTimeout(runFilter, 2000);
    }

    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.nodeType === 1 && (node.tagName === 'TR' || node.tagName === 'TBODY')) {
          rowsAdded = true;
          break;
        }
      }
      if (rowsAdded) break;
    }

    if (rowsAdded) {
      clearTimeout(checkTimeout);
      stableChecks = 0;

      const checkIfStable = () => {
        const currentRowCount = document.querySelectorAll('tbody tr').length;
        // FIX: use hash-resistant selector here too
        const dataElements = document.querySelectorAll(
          'tbody tr [class*="leftSideCss_"], tbody tr strong, tbody tr a[href*="/ark"]'
        ).length;

        if (currentRowCount === lastRowCount && dataElements === lastDataCount &&
            currentRowCount > 0 && dataElements > 0) {
          stableChecks++;
          if (stableChecks >= 3) { runFilter(); return; }
        } else {
          stableChecks = 0;
        }

        lastRowCount = currentRowCount;
        lastDataCount = dataElements;

        if (stableChecks < 40) {
          checkTimeout = setTimeout(checkIfStable, 500);
        } else {
          runFilter();
        }
      };

      checkTimeout = setTimeout(checkIfStable, 1500);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('focus', () => setTimeout(runFilter, 500));
}

function runFilter() {
  if (!settings.autoFilter) return;
  runFilterAction();
}

function runFilterAction() {
  const tbodies = document.getElementsByTagName("tbody");
  if (tbodies.length === 0) return;

  let hiddenCount = 0, totalCount = 0;

  for (let tbody of tbodies) {
    const allChunks = tbody.getElementsByTagName("tr");
    totalCount += allChunks.length;

    for (let chunk of allChunks) {
      let hasMatch = false;
      const chunkElements = chunk.getElementsByTagName("*");

      for (let element of chunkElements) {
        if (element.innerHTML.includes("color: var(--gray00a)") ||
            (element.textContent && element.textContent.includes("View possible tree matches.")) ||
            (element.hasAttribute("aria-label") && element.getAttribute("aria-label").includes("View possible tree matches."))) {
          hasMatch = true;
          break;
        }
      }

      chunk.style.display = hasMatch ? "" : "none";
      if (!hasMatch) hiddenCount++;
    }
  }

  if (hiddenCount > 0) {
    showNotification(`✓ Filtered ${hiddenCount} of ${totalCount} records`, 'info');
  }
}

// ========================================
// EXTRACT
// ========================================

// Called by the manual popup button — always runs regardless of autoExtract setting
function runExtractForCurrentPage() {
  const url = location.href;
  if (url.includes("familysearch.org/ark:/"))
    extractFamilySearchData(true);
  else if (url.includes("ancestry.com/family-tree/person/tree") ||
           url.includes("ancestryinstitution.com/family-tree/person/tree"))
    extractAncestryData(true);
  else if (url.includes("findagrave.com/memorial/"))
    extractFindAGraveData(true);
}

// Waits for labels to appear, then extracts (used by auto-workflow and autoExtract init)
function waitForFamilySearchData() {
  const checkForData = () => {
    const labels = document.querySelectorAll('[class*="leftSideCss_"]');
    if (labels.length > 0) {
      extractFamilySearchData();
      return true;
    }
    return false;
  };

  if (checkForData()) return;

  const observer = new MutationObserver(() => {
    if (checkForData()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// force=true bypasses the autoExtract guard (used by manual button and workflow)
function extractFamilySearchData(force = false) {
  if (!force && !settings.autoExtract) return;

  const personData = { source: "familysearch", timestamp: Date.now() };
  const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, "");

  // FIX: use hash-resistant selectors instead of hardcoded class names
  document.querySelectorAll('[class*="leftSideCss_"]').forEach(label => {
    const key = normalize(label.textContent);
    const valueContainer = label.nextElementSibling;
    if (!valueContainer?.className?.includes("rightSideCss_")) return;

    const valueElement = valueContainer.querySelector("strong");
    if (!valueElement) return;

    const value = valueElement.textContent.trim();
    if      (key === "name")       personData.fullName   = value;
    else if (key === "sex")        personData.sex        = value;
    else if (key === "birthdate")  personData.birthDate  = value;
    else if (key === "birthplace") personData.birthplace = value;
    else if (key === "deathdate")  personData.deathDate  = value;
  });

  if (personData.fullName) {
    const nameParts = personData.fullName.split(/\s+/).filter(Boolean);
    personData.firstName  = nameParts[0] || "";
    personData.lastName   = nameParts[nameParts.length - 1] || "";
    personData.middleName = nameParts.slice(1, -1).join(" ");
  }

  chrome.storage.local.set({ personData }, () => {
    if (!chrome.runtime.lastError) {
      showNotification(`✓ Saved: ${personData.fullName || "Unknown"}`, 'success');
    }
  });
}

function waitForAncestryData() {
  const checkForData = () => {
    const nameElement = document.querySelector("h1.userCardTitle");
    if (nameElement && nameElement.textContent.trim() !== "") {
      extractAncestryData();
      return true;
    }
    return false;
  };

  if (checkForData()) return;

  const observer = new MutationObserver(() => {
    if (checkForData()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function extractAncestryData(force = false) {
  if (!force && !settings.autoExtract) return;

  const personData = { source: "ancestry", timestamp: Date.now() };
  const allElements = document.querySelectorAll("*");

  const nameElement = document.querySelector("h1.userCardTitle");
  if (nameElement) {
    const fullName = nameElement.textContent.trim();
    personData.fullName = fullName;

    const nameParts = fullName.split(/\s+/).filter(Boolean);
    if (nameParts.length === 1) {
      personData.firstName = nameParts[0];
      personData.lastName  = "";
    } else {
      personData.lastName  = nameParts[nameParts.length - 1];
      personData.firstName = nameParts.slice(0, -1).join(" ");
    }
  }

  const datePatterns = [
    /\b\d{1,2}\s+\w+\s+\d{4}\b/g,
    /\b\w+\s+\d{1,2},?\s+\d{4}\b/g,
    /\b\d{4}\b/g
  ];

  // Extract birth
  for (let el of allElements) {
    const text = el.textContent;
    if (text && (text.includes("Birth") || text.includes("Born")) &&
        !text.includes("Death") && !text.includes("Died") && text.length < 200) {

      for (let pattern of datePatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) { personData.birthDate = matches[0]; break; }
      }

      for (let child of Array.from(el.querySelectorAll("*"))) {
        const childText = child.textContent.trim();
        if (childText.includes(",") && childText.split(" ").length > 1 &&
            childText.length > 5 && childText.length < 100 &&
            !childText.includes("Birth") && !childText.includes("Death") &&
            !/\d/.test(childText)) {
          personData.birthplace = childText;
          break;
        }
      }

      if (personData.birthDate) break;
    }
  }

  // Extract death
  for (let el of allElements) {
    const text = el.textContent;
    if (text && (text.includes("Death") || text.includes("Died")) &&
        !text.includes("Birth") && !text.includes("Born") && text.length < 200) {

      for (let pattern of datePatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) { personData.deathDate = matches[0]; break; }
      }

      for (let child of Array.from(el.querySelectorAll("*"))) {
        const childText = child.textContent.trim();
        if (childText.includes(",") && childText.split(" ").length > 1 &&
            childText.length > 5 && childText.length < 100 &&
            !childText.includes("Death") && !childText.includes("Birth") &&
            !/\d/.test(childText)) {
          personData.deathplace = childText;
          break;
        }
      }

      if (personData.deathDate) break;
    }
  }

  chrome.storage.local.set({ personData }, () => {
    if (!chrome.runtime.lastError) {
      showNotification(`✓ Saved: ${personData.fullName || "Unknown"}`, 'success');
    }
  });
}

function waitForFindAGraveData() {
  const checkForData = () => {
    const nameElement = document.querySelector("h1#bio-name");
    if (nameElement && nameElement.textContent.trim() !== "") {
      extractFindAGraveData();
      return true;
    }
    return false;
  };

  if (checkForData()) return;

  const observer = new MutationObserver(() => {
    if (checkForData()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function extractFindAGraveData(force = false) {
  if (!force && !settings.autoExtract) return;

  const personData = { source: "findagrave", timestamp: Date.now() };

  const nameElement = document.querySelector("h1#bio-name");
  if (nameElement) {
    const nameClone = nameElement.cloneNode(true);
    nameClone.querySelectorAll('b, span.visually-hidden').forEach(badge => badge.remove());

    const fullName = nameClone.textContent.trim();
    personData.fullName = fullName;

    const nameParts = fullName.split(/\s+/).filter(Boolean);
    if (nameParts.length === 1) {
      personData.firstName = nameParts[0];
      personData.lastName  = "";
    } else {
      personData.lastName  = nameParts[nameParts.length - 1];
      personData.firstName = nameParts.slice(0, -1).join(" ");
    }
  }

  const birthDate  = document.querySelector("time#birthDateLabel");
  if (birthDate)  personData.birthDate  = birthDate.textContent.trim();

  const birthPlace = document.querySelector("div#birthLocationLabel");
  if (birthPlace) personData.birthplace = birthPlace.textContent.trim();

  const deathDate  = document.querySelector("span#deathDateLabel");
  if (deathDate) {
    personData.deathDate = deathDate.textContent.trim().replace(/\s*\(aged.*?\)\s*$/i, '');
  }

  const deathPlace = document.querySelector("div#deathLocationLabel");
  if (deathPlace) personData.deathplace = deathPlace.textContent.trim();

  chrome.storage.local.set({ personData }, () => {
    if (!chrome.runtime.lastError) {
      showNotification(`✓ Saved: ${personData.fullName || "Unknown"}`, 'success');
    }
  });
}

// ========================================
// AUTO FILL
// ========================================
function setupFormFillObserver() {
  const processedDialogs = new WeakSet();

  const tryDialog = (dialog) => {
    if (processedDialogs.has(dialog)) return;
    processedDialogs.add(dialog);

    setTimeout(() => {
      const hasFirstName = dialog.querySelector('input[data-testid="first-name"]');
      const hasLastName  = dialog.querySelector('input[data-testid="last-name"]');
      if (hasFirstName && hasLastName) {
        console.log("✅ Add Person popup detected");
        waitForFormToLoad(dialog);
      }
    }, 500);
  };

  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.getAttribute?.('role') === 'dialog') tryDialog(node);
        node.querySelectorAll?.('[role="dialog"]').forEach(tryDialog);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function waitForFormToLoad(dialogElement) {
  const checkFormReady = () =>
    dialogElement.querySelector('input[data-testid="first-name"]') &&
    dialogElement.querySelector('input[data-testid="last-name"]') &&
    dialogElement.querySelector('input[name="birthDate"]');

  // Only auto-fill from the observer if autoFill is ON; manual button passes force=true separately
  if (checkFormReady()) { fillPersonForm(settings.autoFill); return; }

  let attempts = 0;
  const formObserver = new MutationObserver(() => {
    if (checkFormReady()) { formObserver.disconnect(); fillPersonForm(settings.autoFill); }
  });
  formObserver.observe(dialogElement, { childList: true, subtree: true });

  const checkInterval = setInterval(() => {
    attempts++;
    if (checkFormReady() || attempts >= 30) {
      clearInterval(checkInterval);
      formObserver.disconnect();
      fillPersonForm(settings.autoFill);
    }
  }, 100);
}

// force=true bypasses the autoFill guard (used by manual button and form observer)
function fillPersonForm(force = false) {
  try {
    chrome.storage.local.get(['personData'], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Storage error - extension may have reloaded. Please refresh the page.");
        return;
      }
      if (!result.personData) {
        showNotification("⚠️ No person data found", 'warning');
        return;
      }
      fillFormWithData(result.personData, force);
    });
  } catch (error) {
    console.error("Extension context invalidated - please refresh the page");
  }
}

function fillFormWithData(personData, force = false) {
  if (!force && !settings.autoFill) return;

  const firstNameField = document.querySelector("input[data-testid='first-name']");
  const lastNameField  = document.querySelector("input[data-testid='last-name']");

  if (!firstNameField || !lastNameField) {
    showNotification("⚠️ Form fields not found", 'warning');
    return;
  }

  // Ensure firstName/lastName are populated even if only fullName was saved
  if (!personData.firstName && !personData.lastName && personData.fullName) {
    const nameParts = personData.fullName.trim().split(/\s+/);
    personData.lastName  = nameParts.length > 1 ? nameParts.pop() : "";
    personData.firstName = nameParts.join(" ");
  }

  const firstNameWithMiddle = (personData.firstName || "") +
    (personData.middleName ? " " + personData.middleName : "");

  const setInput = (element, value) => {
    if (!element) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    element.focus();
    setter.call(element, value);
    element.dispatchEvent(new Event('input',  { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const setDate = (fieldName, value) => new Promise(resolve => {
    if (!value) { resolve(); return; }

    const input = document.querySelector(`input[name='${fieldName}']`);
    if (!input) { resolve(); return; }

    input.scrollIntoView({ block: "center" });
    input.focus();

    setTimeout(() => {
      setInput(input, value);

      setTimeout(() => {
        input.value += "a";
        input.dispatchEvent(new Event('input', { bubbles: true }));

        setTimeout(() => {
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));

          let autocompleteAttempts = 0;
          const checkForAutocomplete = setInterval(() => {
            const options = Array.from(document.querySelectorAll(
              '[role="option"], [data-testid*="standardized-date"]'
            ));

            if (options.length > 1) {
              options[1].click();
              clearInterval(checkForAutocomplete);
              setTimeout(resolve, TIMING.AUTOCOMPLETE_CLICK_DELAY);
            } else if (options[0] && autocompleteAttempts > 5) {
              options[0].click();
              clearInterval(checkForAutocomplete);
              setTimeout(resolve, TIMING.AUTOCOMPLETE_CLICK_DELAY);
            }

            if (++autocompleteAttempts > TIMING.AUTOCOMPLETE_TIMEOUT) {
              clearInterval(checkForAutocomplete);
              resolve();
            }
          }, TIMING.AUTOCOMPLETE_CHECK);
        }, TIMING.DATE_TRIGGER_DELAY);
      }, TIMING.DATE_TRIGGER_DELAY);
    }, TIMING.DATE_FOCUS_DELAY);
  });

  Promise.resolve()
    .then(() => { setInput(firstNameField, firstNameWithMiddle); return new Promise(r => setTimeout(r, TIMING.FIELD_DELAY)); })
    .then(() => { setInput(lastNameField, personData.lastName || ""); return new Promise(r => setTimeout(r, TIMING.FIELD_DELAY)); })
    .then(() => {
      if (personData.sex) {
        const sex = personData.sex.toLowerCase() === "male" ? "male" : "female";
        document.querySelectorAll('[class*="radioCss_"]').forEach(radio => {
          if (radio.value.toLowerCase() === sex) radio.click();
        });
      }
      return new Promise(r => setTimeout(r, TIMING.FIELD_DELAY));
    })
    .then(() => {
      document.querySelectorAll('[class*="radioCss_"]').forEach(radio => {
        if (radio.value === "deceased") radio.click();
      });
      return new Promise(r => setTimeout(r, TIMING.FIELD_DELAY));
    })
    .then(() => setDate("birthDate", personData.birthDate))
    .then(() => setDate("deathDate", personData.deathDate))
    .then(() => { setInput(document.querySelector("input[name='birthPlace']"), personData.birthplace || ""); return new Promise(r => setTimeout(r, TIMING.FIELD_DELAY)); })
    .then(() => { setInput(document.querySelector("input[name='deathPlace']"), personData.deathplace || ""); return new Promise(r => setTimeout(r, TIMING.FIELD_DELAY)); })
    .then(() => { showNotification("✓ Form filled successfully!", 'success'); });
}

// ========================================
// NAV BUTTON — addEventListener patch
// Wraps future mousedown/mouseup/click listeners on document and window so
// they don't fire when the target is our injected "Add Person" nav button
// OR when the target is inside the add-person popup dialog.
// Includes mouseup because the site's dismiss handler fires on mouseup after
// a drag, which was destroying the popup after any move operation.
// Must run before the site registers its own dismiss handlers.
// ========================================
(function () {
  const BTN_ID        = 'fs-quick-add-nav-btn';
  const DIALOG_ATTR   = 'data-testid';
  const DIALOG_VALUES = ['add-person-modal', 'add-unconnected-person-modal'];

  function isProtectedTarget(e) {
    if (!e.target || !e.target.closest) return false;
    // Guard: our nav button
    if (e.target.closest('#' + BTN_ID)) return true;
    // Guard: the open add-person popup dialog and anything inside it
    for (const val of DIALOG_VALUES) {
      if (e.target.closest(`[${DIALOG_ATTR}="${val}"]`)) return true;
    }
    // Guard: any open [role="dialog"] that contains an add-person form
    const dialog = e.target.closest('[role="dialog"]');
    if (dialog && (
      dialog.querySelector('input[data-testid="first-name"]') ||
      dialog.querySelector('input[name="birthDate"]')
    )) return true;
    return false;
  }

  const _origAEL = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (typeof listener !== 'function') {
      return _origAEL.call(this, type, listener, options);
    }
    if ((type === 'mousedown' || type === 'mouseup' || type === 'click') &&
        (this === document || this === window)) {
      const wrapped = function (e) {
        if (isProtectedTarget(e)) return;
        return listener.call(this, e);
      };
      return _origAEL.call(this, type, wrapped, options);
    }
    return _origAEL.call(this, type, listener, options);
  };
})();

// ========================================
// NAV BUTTON — main logic
// ========================================
(function () {
  'use strict';

  const BTN_ID            = 'fs-quick-add-nav-btn';
  const REAL_BTN_SELECTOR = '[data-testid="add-unconnected-person"]';
  const NAV_SELECTOR      = 'nav[aria-label="Main"]';

// Inject page_bridge.js directly into the root document element early
  function injectBridge() {
    if (document.getElementById('fs-bridge')) return;
    const s = document.createElement('script');
    s.id  = 'fs-bridge';
    s.src = chrome.runtime.getURL('page_bridge.js');
    // Append directly to the document root element so it initializes immediately
    (document.head || document.documentElement).appendChild(s);
  }

  function injectStyles() {
    if (document.getElementById('fs-quick-add-styles')) return;
    const s = document.createElement('style');
    s.id = 'fs-quick-add-styles';
    s.textContent = `
      #${BTN_ID} {
        cursor: pointer !important;
        font-weight: 400 !important;
        letter-spacing: normal !important;
        -webkit-font-smoothing: antialiased;
      }
    `;
    document.head.appendChild(s);
  }

  function createNavBtn() {
    if (document.getElementById(BTN_ID)) return;
    const nav = document.querySelector(NAV_SELECTOR);
    if (!nav) return;

    const activitiesBtn = nav.querySelector('[data-test-id="hdr_activities"]');
    if (!activitiesBtn) return;
    
    const activitiesSpan = activitiesBtn.closest('span');
    if (!activitiesSpan) return;

    // 1. Clone the wrapper structure
    const wrapperClone = activitiesSpan.cloneNode(true);
    
    const btn = wrapperClone.querySelector('button') || wrapperClone.querySelector('a');
    if (!btn) return;

    btn.id = BTN_ID;
    btn.setAttribute('data-test-id', 'hdr_quick-add-person');
    btn.removeAttribute('aria-expanded');
    btn.removeAttribute('aria-haspopup');
    btn.removeAttribute('aria-controls');
    btn.innerHTML = 'Add Person';
    // ─────────────────────────────────────────────────────────────────

    const newBtn = btn.cloneNode(true);
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleClick();
    });

    btn.replaceWith(newBtn);
    activitiesSpan.insertAdjacentElement('afterend', wrapperClone);
  }

  function removeNavBtn() {
    document.getElementById(BTN_ID)?.closest('span')?.remove();
  }

  function reactClick(btn) {
    const selector = btn.getAttribute('data-testid')
      ? `[data-testid="${btn.getAttribute('data-testid')}"]`
      : `#${btn.id}`;
    window.dispatchEvent(new CustomEvent('fs-quick-add', { detail: { selector } }));
    return true;
  }

  function handleClick() {
    // Prevent double-firing
    if (handleClick._busy) return;
    handleClick._busy = true;
    setTimeout(() => { handleClick._busy = false; }, 1000);

    // If the overlay is already open, the script handles it; if closed, it opens and runs it.
    // We send a single event to let the page context handle the entire chain sequentially.
    window.dispatchEvent(new CustomEvent('fs-quick-add-direct'));
  }

  function findVisibleRealBtn() {
    const btn = document.querySelector(REAL_BTN_SELECTOR);
    if (!btn) return null;
    const overlay = btn.closest('[data-testid="recents-overlay"]');
    if (!overlay) return null;
    if (overlay.closest('[style*="display: none"]')) return null;
    return btn;
  }

  // Re-inject button on SPA navigation
  function onNavigate() {
    injectStyles();
	injectBridge();
    setTimeout(() => { removeNavBtn(); createNavBtn(); }, 400);
  }

  const _push    = history.pushState.bind(history);
  const _replace = history.replaceState.bind(history);
  history.pushState    = (...a) => { _push(...a);    onNavigate(); };
  history.replaceState = (...a) => { _replace(...a); onNavigate(); };
  window.addEventListener('popstate', onNavigate);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onNavigate);
  } else {
    onNavigate();
  }

  // Re-create button if it gets removed by a React re-render
  const mo = new MutationObserver(() => {
    if (!document.getElementById(BTN_ID) && document.querySelector(NAV_SELECTOR)) {
      onNavigate();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

})();