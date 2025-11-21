// tools.js — your functions

function tool1() {
    // FamilySearch Filter Tool
(function() {
  // Check if we're on a FamilySearch search record page
  if (!location.href.includes("familysearch.org/en/search/record/")) {
    console.warn("⚠️ FamilySearch Filter works best on search record pages");
  }
  function hideChunksThatDontMatch() {
    // Get all table body elements on the page
    const tbodies = document.getElementsByTagName("tbody");
    
    // Loop through each table body
    for (let tbody of tbodies) {
      // Get all table rows within this tbody
      const allChunks = tbody.getElementsByTagName("tr");
      
      // Loop through each row (chunk)
      for (let chunk of allChunks) {
        let hasMatch = false;
        
        // Get all elements within this row
        const chunkElements = chunk.getElementsByTagName("*");
        
        // Check each element for matching indicators
        for (let element of chunkElements) {
          // Check 1: Look for specific color style
          if (element.innerHTML.includes("color: var(--gray00a)")) {
            hasMatch = true;
            break;
          }
          
          // Check 2: Look for "View possible tree matches" in text content
          if (element.textContent && 
              element.textContent.includes("View possible tree matches.")) {
            hasMatch = true;
            break;
          }
          
          // Check 3: Look for "View possible tree matches" in aria-label
          if (element.hasAttribute("aria-label") && 
              element.getAttribute("aria-label").includes("View possible tree matches.")) {
            hasMatch = true;
            break;
          }
        }
        
        // Show the row if it has a match, hide it otherwise
        chunk.style.display = hasMatch ? "" : "none";
      }
    }
  }

  // Run the filter function
  hideChunksThatDontMatch();
})();
}

function tool2() {
// FamilySearch Add New Person Tool
// Extracts person data from records and auto-fills the add person form

(async function() {
  try {
    const currentUrl = location.href;
    
    if (currentUrl.includes("familysearch.org/ark:/")) {
      await extractPersonData();
    } else if (currentUrl.includes("ancestry.com/family-tree/person/tree")) {
      await extractAncestryData();
    } else if (currentUrl.includes("findagrave.com/memorial/")) {
      await extractFindAGraveData();
    } else if (currentUrl.includes("familysearch.org/en/tree/")) {
      await autoClickAddPerson();
      await fillPersonForm();
    } else {
      console.log("This script works on FamilySearch, Ancestry, or FindAGrave pages.");
    }
    
  } catch (error) {
    console.error("Error in Add New Person script:", error);
  }

  // ========================================
  // HELPER: Show auto-dismiss notification
  // ========================================
  function showNotification(message, duration = 2000) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #48bb78;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  // ========================================
  // Extract data from record page
  // ========================================
  async function extractPersonData() {
    console.log("📋 Extracting person data from record...");
    
    const personData = {};
    const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, "");
    
    document.querySelectorAll(".leftSideCss_lebwza5").forEach(label => {
      const key = normalize(label.textContent);
      const valueContainer = label.nextElementSibling;
      
      if (!valueContainer?.classList.contains("rightSideCss_r1y3a6mc")) return;
      
      const valueElement = valueContainer.querySelector("strong");
      if (!valueElement) return;
      
      const value = valueElement.textContent.trim();
      
      if (key === "name") personData.fullName = value;
      else if (key === "sex") personData.sex = value;
      else if (key === "birthdate") personData.birthDate = value;
      else if (key === "birthplace") personData.birthplace = value;
      else if (key === "deathdate") personData.deathDate = value;
    });
    
    if (personData.fullName) {
      const nameParts = personData.fullName.split(/\s+/).filter(Boolean);
      personData.firstName = nameParts[0] || "";
      personData.lastName = nameParts[nameParts.length - 1] || "";
      personData.middleName = nameParts.slice(1, -1).join(" ");
    }
    
    // Add timestamp
    personData.timestamp = Date.now();
    
    localStorage.setItem("fs_person_data", JSON.stringify(personData));
    console.log("✅ Person data saved:", personData);
    showNotification(`✅ Data extracted: ${personData.fullName || "Unknown"}`);
  }

  // ========================================
  // Extract data from Ancestry page
  // ========================================
  async function extractAncestryData() {
    console.log("📋 Extracting person data from Ancestry...");
    
    const personData = {
      source: "ancestry"  // Add a marker to identify Ancestry data
    };
    
    // Extract full name
    const nameElement = document.querySelector("h1.userCardTitle");
    if (nameElement) {
      const fullName = nameElement.textContent.trim();
      personData.fullName = fullName;
      
      // Split name: everything except last word = first name, last word = last name
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      if (nameParts.length === 1) {
        personData.firstName = nameParts[0];
        personData.lastName = "";
        personData.middleName = "";
      } else {
        personData.lastName = nameParts[nameParts.length - 1];
        personData.firstName = nameParts.slice(0, -1).join(" ");
        personData.middleName = "";
      }
    }
    
    // Extract birth date and place
    const birthSection = Array.from(document.querySelectorAll(".userCardContent")).find(
      section => section.querySelector("h3.userCardTitle")?.textContent.trim() === "Birth"
    );
    if (birthSection) {
      const birthDate = birthSection.querySelector(".factItemDate");
      if (birthDate) {
        personData.birthDate = birthDate.textContent.trim();
      }
      
      const birthPlace = birthSection.querySelector(".factItemLocation");
      if (birthPlace) {
        personData.birthplace = birthPlace.textContent.trim();
      }
    }
    
    // Extract death date and place
    const deathSection = Array.from(document.querySelectorAll(".userCardContent")).find(
      section => section.querySelector("h3.userCardTitle")?.textContent.trim() === "Death"
    );
    if (deathSection) {
      const deathDate = deathSection.querySelector(".factItemDate");
      if (deathDate) {
        personData.deathDate = deathDate.textContent.trim();
      }
      
      const deathPlace = deathSection.querySelector(".factItemLocation");
      if (deathPlace) {
        personData.deathplace = deathPlace.textContent.trim();
      }
    }
    
    // Add timestamp
    personData.timestamp = Date.now();
    
    // Save to clipboard as JSON (works cross-domain!)
    const jsonData = JSON.stringify(personData);
    try {
      await navigator.clipboard.writeText(jsonData);
      console.log("✅ Ancestry data saved to clipboard:", personData);
      showNotification(`✅ Data extracted: ${personData.fullName || "Unknown"}`);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      alert("❌ Could not copy to clipboard. Please allow clipboard permissions.");
    }
  }

  // ========================================
  // Extract data from FindAGrave page
  // ========================================
  async function extractFindAGraveData() {
    console.log("📋 Extracting person data from FindAGrave...");
    
    const personData = {
      source: "findagrave"
    };
    
    // Extract full name
    const nameElement = document.querySelector("h1#bio-name");
    if (nameElement) {
      // Remove any extra elements like veteran badges
      const nameClone = nameElement.cloneNode(true);
      const badges = nameClone.querySelectorAll('b, span.visually-hidden');
      badges.forEach(badge => badge.remove());
      
      const fullName = nameClone.textContent.trim();
      personData.fullName = fullName;
      
      // Split name: everything except last word = first name, last word = last name
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      if (nameParts.length === 1) {
        personData.firstName = nameParts[0];
        personData.lastName = "";
        personData.middleName = "";
      } else {
        personData.lastName = nameParts[nameParts.length - 1];
        personData.firstName = nameParts.slice(0, -1).join(" ");
        personData.middleName = "";
      }
    }
    
    // Extract birth date
    const birthDate = document.querySelector("time#birthDateLabel");
    if (birthDate) {
      personData.birthDate = birthDate.textContent.trim();
    }
    
    // Extract birth place
    const birthPlace = document.querySelector("div#birthLocationLabel");
    if (birthPlace) {
      personData.birthplace = birthPlace.textContent.trim();
    }
    
    // Extract death date
    const deathDate = document.querySelector("span#deathDateLabel");
    if (deathDate) {
      // Remove the age part if present (e.g., "2 May 1993 (aged 60)" -> "2 May 1993")
      let deathText = deathDate.textContent.trim();
      deathText = deathText.replace(/\s*\(aged.*?\)\s*$/i, '');
      personData.deathDate = deathText;
    }
    
    // Extract death place
    const deathPlace = document.querySelector("div#deathLocationLabel");
    if (deathPlace) {
      personData.deathplace = deathPlace.textContent.trim();
    }
    
    // Add timestamp
    personData.timestamp = Date.now();
    
    // Save to clipboard as JSON (works cross-domain!)
    const jsonData = JSON.stringify(personData);
    try {
      await navigator.clipboard.writeText(jsonData);
      console.log("✅ FindAGrave data saved to clipboard:", personData);
      showNotification(`✅ Data extracted: ${personData.fullName || "Unknown"}`);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      alert("❌ Could not copy to clipboard. Please allow clipboard permissions.");
    }
  }

  // ========================================
  // Auto-click "Add Unconnected Person"
  // ========================================
  async function autoClickAddPerson() {
    // Check if ANY add person popup is already open
    const existingDialogs = [
      document.querySelector('[role="dialog"][aria-label="Add Unconnected Person"]'),
      document.querySelector('[role="dialog"][aria-label*="Add Parent"]'),
      document.querySelector('[role="dialog"][aria-label*="Add Spouse"]'),
      document.querySelector('[role="dialog"][aria-label*="Add Child"]'),
      // Generic fallback - check if any dialog with person form fields exists
      document.querySelector('[role="dialog"] input[data-testid="first-name"]')
    ];
    
    const openDialog = existingDialogs.find(dialog => dialog !== null);
    
    if (openDialog) {
      console.log("✅ Add Person popup already open, skipping button click");
      return;
    }
    
    console.log("🖱️ Auto-clicking Add Person button...");
    
    function realClick(element) {
      element.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        isTrusted: true
      }));
    }
    
    let attemptCount = 0;
    
    await new Promise((resolve) => {
      const findRecentsButton = setInterval(function() {
        const recentsButton = document.querySelector('button[data-testid="recents-button"]');
        
        if (recentsButton) {
          clearInterval(findRecentsButton);
          realClick(recentsButton);
          
          let addButtonAttempts = 0;
          const findAddButton = setInterval(function() {
            const addButton = document.querySelector('button[data-testid="add-unconnected-person"]');
            
            if (addButton) {
              clearInterval(findAddButton);
              setTimeout(function() {
                realClick(addButton);
                resolve();
              }, 500);
            } else if (addButtonAttempts++ > 40) {
              clearInterval(findAddButton);
              resolve();
            }
          }, 250);
          
        } else if (attemptCount++ > 40) {
          clearInterval(findRecentsButton);
          resolve();
        }
      }, 250);
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // ========================================
  // Fill the add person form
  // ========================================
  async function fillPersonForm() {
    console.log("📝 Filling person form...");
    
    let ancestryData = null;
    let familysearchData = null;
    
    // Check clipboard for Ancestry data
    try {
      const clipboardText = await navigator.clipboard.readText();
      console.log("🔍 Clipboard contents:", clipboardText.substring(0, 100) + "...");
      
      if (clipboardText.startsWith("{")) {
        try {
          const parsed = JSON.parse(clipboardText);
          console.log("🔍 Parsed clipboard data:", parsed);
          
          if (parsed.source === "ancestry" || parsed.source === "findagrave") {
            ancestryData = parsed;
            console.log("✅ Found clipboard data (timestamp:", ancestryData.timestamp, ")");
          }
        } catch (parseError) {
          console.warn("⚠️ Could not parse clipboard JSON:", parseError);
        }
      }
    } catch (e) {
      console.warn("❌ Could not read clipboard:", e);
    }
    
    // Check localStorage for FamilySearch data
    try {
      const stored = JSON.parse(localStorage.getItem("fs_person_data") || "{}");
      if (stored.firstName || stored.fullName) {
        familysearchData = stored;
        console.log("✅ Found FamilySearch data in localStorage (timestamp:", familysearchData.timestamp, ")");
      }
    } catch (e) {
      console.warn("No localStorage data found");
    }
    
    // Compare timestamps and use the newer data
    let personData = {};
    let dataSource = "none";
    
    if (ancestryData && familysearchData) {
      // Both exist - use whichever is newer
      const ancestryTime = ancestryData.timestamp || 0;
      const fsTime = familysearchData.timestamp || 0;
      
      if (ancestryTime > fsTime) {
        personData = ancestryData;
        dataSource = "ancestry";
        console.log("🎯 Using Ancestry data (newer)");
      } else {
        personData = familysearchData;
        dataSource = "familysearch";
        console.log("🎯 Using FamilySearch data (newer)");
      }
    } else if (ancestryData) {
      personData = ancestryData;
      dataSource = "ancestry";
      console.log("🎯 Using Ancestry data (only source)");
    } else if (familysearchData) {
      personData = familysearchData;
      dataSource = "familysearch";
      console.log("🎯 Using FamilySearch data (only source)");
    }
    
    console.log("🎯 Final data source:", dataSource);
    console.log("🎯 Final person data:", personData);
    
    if (!personData.firstName && !personData.fullName) {
      alert("⚠️ No person data found.\n\nPlease run this on a record page or Ancestry page first.");
      return;
    }
    
    if (!personData.firstName || !personData.lastName) {
      const nameParts = (personData.fullName || "").trim().split(/\s+/);
      personData.lastName = nameParts.length > 1 ? nameParts.pop() : "";
      personData.firstName = nameParts.join(" ");
    }
    
    const firstNameWithMiddle = (personData.firstName || "") + 
                                (personData.middleName ? " " + personData.middleName : "");

    const setInput = (element, value) => {
      if (!element) return;
      
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype, 
        'value'
      ).set;
      
      element.focus();
      nativeInputValueSetter.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const setDate = (fieldName, value) => new Promise(resolve => {
      if (!value) {
        resolve();
        return;
      }
      
      const checkForField = setInterval(() => {
        const input = document.querySelector(`input[name='${fieldName}']`);
        
        if (input) {
          clearInterval(checkForField);
          
          input.scrollIntoView({ block: "center" });
          input.focus();
          setInput(input, value);
          
          input.value += "a";
          input.dispatchEvent(new Event('input', { bubbles: true }));
          
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
              resolve();
            } else if (options[0] && autocompleteAttempts > 3) {
              options[0].click();
              clearInterval(checkForAutocomplete);
              resolve();
            }
            
            if (++autocompleteAttempts > 20) {
              clearInterval(checkForAutocomplete);
              resolve();
            }
          }, 100);
        }
      }, 100);
    });

    setInput(document.querySelector("input[data-testid='first-name']"), firstNameWithMiddle);
    setInput(document.querySelector("input[data-testid='last-name']"), personData.lastName || "");
    
    if (personData.sex) {
      const sex = personData.sex.toLowerCase() === "male" ? "male" : "female";
      document.querySelectorAll(".radioCss_rw3ic9v").forEach(radio => {
        if (radio.value.toLowerCase() === sex) {
          radio.click();
        }
      });
    }
    
    document.querySelectorAll(".radioCss_rw3ic9v").forEach(radio => {
      if (radio.value === "deceased") {
        radio.click();
      }
    });
    
    // Fill dates first (both auto-standardize)
    await setDate("birthDate", personData.birthDate);
    await setDate("deathDate", personData.deathDate);
    
    // Then fill places (user manually standardizes these)
    setInput(document.querySelector("input[name='birthPlace']"), personData.birthplace || "");
    setInput(document.querySelector("input[name='deathPlace']"), personData.deathplace || "");
    
    console.log("✅ Form filled successfully!");
  }
  
})();
}

function tool3() {
// Try clipboard, prompt as backup
(async function() {
  let personId;
  
  try {
    // Try to read clipboard
    personId = await navigator.clipboard.readText();
    if (!personId || personId.trim() === "") {
      throw new Error("Empty clipboard");
    }
  } catch (error) {
    // If clipboard fails, prompt user
    personId = prompt("Please paste the Person ID:");
  }
  
  if (!personId || personId.trim() === "") {
    alert("No ID provided!");
    return;
  }
  
  const cleanId = personId.trim();
  window.location.href = "https://www.familysearch.org/en/tree/person/details/" + encodeURIComponent(cleanId);
})();
}

// FamilySearch Add New Person Tool
// Extracts person data from records and auto-fills the add person form

// Main function that gets called
async function tool4() {
  try {
    const currentUrl = location.href;
    
    if (currentUrl.includes("familysearch.org/ark:/")) {
      return await extractPersonData();
    } else if (currentUrl.includes("ancestry.com/family-tree/person/tree")) {
      return await extractAncestryData();
    } else if (currentUrl.includes("findagrave.com/memorial/")) {
      return await extractFindAGraveData();
   } else if (currentUrl.includes("familysearch.org/en/tree/")) {
  // Check if form is already open
  const formAlreadyOpen = document.querySelector('[role="dialog"] input[data-testid="first-name"]');
  
  if (!formAlreadyOpen) {
    await autoClickAddPerson();
  } else {
    console.log("✅ Form already open, skipping auto-click");
  }
  
  await fillPersonForm();
  return "Form filled";

    } else {
      console.log("This script works on FamilySearch, Ancestry, or FindAGrave pages.");
      return "Invalid page";
    }
    
  } catch (error) {
    console.error("Error in Add New Person script:", error);
    return "Error: " + error.message;
  }
}
// ========================================
// HELPER: Show auto-dismiss notification
// ========================================
function showNotification(message, duration = 2000) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #48bb78;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// ========================================
// Extract data from record page
// ========================================
async function extractPersonData() {
  console.log("📋 Extracting person data from record...");
  
  const personData = {};
  const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, "");
  
  document.querySelectorAll(".leftSideCss_lebwza5").forEach(label => {
    const key = normalize(label.textContent);
    const valueContainer = label.nextElementSibling;
    
    if (!valueContainer?.classList.contains("rightSideCss_r1y3a6mc")) return;
    
    const valueElement = valueContainer.querySelector("strong");
    if (!valueElement) return;
    
    const value = valueElement.textContent.trim();
    
    if (key === "name") personData.fullName = value;
    else if (key === "sex") personData.sex = value;
    else if (key === "birthdate") personData.birthDate = value;
    else if (key === "birthplace") personData.birthplace = value;
    else if (key === "deathdate") personData.deathDate = value;
  });
  
  if (personData.fullName) {
    const nameParts = personData.fullName.split(/\s+/).filter(Boolean);
    personData.firstName = nameParts[0] || "";
    personData.lastName = nameParts[nameParts.length - 1] || "";
    personData.middleName = nameParts.slice(1, -1).join(" ");
  }
  
  // Add timestamp
  personData.timestamp = Date.now();
  
  localStorage.setItem("fs_person_data", JSON.stringify(personData));
  console.log("✅ Person data saved:", personData);
  showNotification(`✅ Data extracted: ${personData.fullName || "Unknown"}`);
  
  return JSON.stringify(personData); // Return for iOS Shortcut
}

// ========================================
// Extract data from Ancestry page
// ========================================
async function extractAncestryData() {
  console.log("📋 Extracting person data from Ancestry...");
  
  const personData = {
    source: "ancestry"
  };
  
  // Extract full name
  const nameElement = document.querySelector("h1.userCardTitle");
  if (nameElement) {
    const fullName = nameElement.textContent.trim();
    personData.fullName = fullName;
    
    // Split name: everything except last word = first name, last word = last name
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    if (nameParts.length === 1) {
      personData.firstName = nameParts[0];
      personData.lastName = "";
      personData.middleName = "";
    } else {
      personData.lastName = nameParts[nameParts.length - 1];
      personData.firstName = nameParts.slice(0, -1).join(" ");
      personData.middleName = "";
    }
  }
  
  // Extract birth date and place
  const birthSection = Array.from(document.querySelectorAll(".userCardContent")).find(
    section => section.querySelector("h3.userCardTitle")?.textContent.trim() === "Birth"
  );
  if (birthSection) {
    const birthDate = birthSection.querySelector(".factItemDate");
    if (birthDate) {
      personData.birthDate = birthDate.textContent.trim();
    }
    
    const birthPlace = birthSection.querySelector(".factItemLocation");
    if (birthPlace) {
      personData.birthplace = birthPlace.textContent.trim();
    }
  }
  
  // Extract death date and place
  const deathSection = Array.from(document.querySelectorAll(".userCardContent")).find(
    section => section.querySelector("h3.userCardTitle")?.textContent.trim() === "Death"
  );
  if (deathSection) {
    const deathDate = deathSection.querySelector(".factItemDate");
    if (deathDate) {
      personData.deathDate = deathDate.textContent.trim();
    }
    
    const deathPlace = deathSection.querySelector(".factItemLocation");
    if (deathPlace) {
      personData.deathplace = deathPlace.textContent.trim();
    }
  }
  
  // Add timestamp
  personData.timestamp = Date.now();
  
  const jsonData = JSON.stringify(personData);
  
  // Try to copy to clipboard for desktop users
  try {
    await navigator.clipboard.writeText(jsonData);
    console.log("✅ Data copied to clipboard");
  } catch (e) {
    console.warn("Clipboard not available, returning data to shortcut");
  }
  
  console.log("✅ Ancestry data extracted:", personData);
  showNotification(`✅ Data extracted: ${personData.fullName || "Unknown"}`);
  
  return jsonData; // Return for iOS Shortcut
}

// ========================================
// Extract data from FindAGrave page
// ========================================
async function extractFindAGraveData() {
  console.log("📋 Extracting person data from FindAGrave...");
  
  const personData = {
    source: "findagrave"
  };
  
  // Extract full name
  const nameElement = document.querySelector("h1#bio-name");
  if (nameElement) {
    // Remove any extra elements like veteran badges
    const nameClone = nameElement.cloneNode(true);
    const badges = nameClone.querySelectorAll('b, span.visually-hidden');
    badges.forEach(badge => badge.remove());
    
    const fullName = nameClone.textContent.trim();
    personData.fullName = fullName;
    
    // Split name: everything except last word = first name, last word = last name
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    if (nameParts.length === 1) {
      personData.firstName = nameParts[0];
      personData.lastName = "";
      personData.middleName = "";
    } else {
      personData.lastName = nameParts[nameParts.length - 1];
      personData.firstName = nameParts.slice(0, -1).join(" ");
      personData.middleName = "";
    }
  }
  
  // Extract birth date
  const birthDate = document.querySelector("time#birthDateLabel");
  if (birthDate) {
    personData.birthDate = birthDate.textContent.trim();
  }
  
  // Extract birth place
  const birthPlace = document.querySelector("div#birthLocationLabel");
  if (birthPlace) {
    personData.birthplace = birthPlace.textContent.trim();
  }
  
  // Extract death date
  const deathDate = document.querySelector("span#deathDateLabel");
  if (deathDate) {
    // Remove the age part if present (e.g., "2 May 1993 (aged 60)" -> "2 May 1993")
    let deathText = deathDate.textContent.trim();
    deathText = deathText.replace(/\s*\(aged.*?\)\s*$/i, '');
    personData.deathDate = deathText;
  }
  
  // Extract death place
  const deathPlace = document.querySelector("div#deathLocationLabel");
  if (deathPlace) {
    personData.deathplace = deathPlace.textContent.trim();
  }
  
  // Add timestamp
  personData.timestamp = Date.now();
  
  const jsonData = JSON.stringify(personData);
  
  // Try to copy to clipboard for desktop users
  try {
    await navigator.clipboard.writeText(jsonData);
    console.log("✅ Data copied to clipboard");
  } catch (e) {
    console.warn("Clipboard not available, returning data to shortcut");
  }
  
  console.log("✅ FindAGrave data extracted:", personData);
  showNotification(`✅ Data extracted: ${personData.fullName || "Unknown"}`);
  
  return jsonData; // Return for iOS Shortcut
}

// ========================================
// Auto-click "Add Unconnected Person"
// ========================================
async function autoClickAddPerson() {
  // Check if ANY add person popup is already open
  const existingDialogs = [
    document.querySelector('[role="dialog"][aria-label="Add Unconnected Person"]'),
    document.querySelector('[role="dialog"][aria-label*="Add Parent"]'),
    document.querySelector('[role="dialog"][aria-label*="Add Spouse"]'),
    document.querySelector('[role="dialog"][aria-label*="Add Child"]'),
    // Generic fallback - check if any dialog with person form fields exists
    document.querySelector('[role="dialog"] input[data-testid="first-name"]')
  ];
  
  const openDialog = existingDialogs.find(dialog => dialog !== null);
  
  if (openDialog) {
    console.log("✅ Add Person popup already open, skipping button click");
    return;
  }
  
  console.log("🖱️ Auto-clicking Add Person button...");
  
  function realClick(element) {
    element.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      isTrusted: true
    }));
  }
  
  let attemptCount = 0;
  
  await new Promise((resolve) => {
    const findRecentsButton = setInterval(function() {
      const recentsButton = document.querySelector('button[data-testid="recents-button"]');
      
      if (recentsButton) {
        clearInterval(findRecentsButton);
        realClick(recentsButton);
        
        let addButtonAttempts = 0;
        const findAddButton = setInterval(function() {
          const addButton = document.querySelector('button[data-testid="add-unconnected-person"]');
          
          if (addButton) {
            clearInterval(findAddButton);
            setTimeout(function() {
              realClick(addButton);
              resolve();
            }, 500);
          } else if (addButtonAttempts++ > 40) {
            clearInterval(findAddButton);
            resolve();
          }
        }, 250);
        
      } else if (attemptCount++ > 40) {
        clearInterval(findRecentsButton);
        resolve();
      }
    }, 250);
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
}
// ========================================
// Fill form with data passed directly (for iOS)
// ========================================
async function fillPersonFormWithData(clipboardData) {
  console.log("📝 Filling person form with passed data...");
  
  let ancestryData = null;
  let familysearchData = null;
  let personData = {};
  let dataSource = "none";
  
  // Parse the passed clipboard data
  if (clipboardData && clipboardData.startsWith("{")) {
    try {
      const parsed = JSON.parse(clipboardData);
      console.log("✅ Successfully parsed passed data");
      console.log("Source:", parsed.source);
      
      if (parsed.source === "ancestry" || parsed.source === "findagrave") {
        ancestryData = parsed;
        console.log("✅ Found passed clipboard data (timestamp:", ancestryData.timestamp, ")");
      }
    } catch (parseError) {
      console.warn("⚠️ Could not parse passed data:", parseError);
    }
  }
  
  // Check localStorage as fallback
  try {
    const stored = JSON.parse(localStorage.getItem("fs_person_data") || "{}");
    if (stored.firstName || stored.fullName) {
      familysearchData = stored;
      console.log("✅ Found FamilySearch data in localStorage");
    }
  } catch (e) {
    console.warn("No localStorage data found");
  }
  
  // ALWAYS prefer the passed data
  if (ancestryData) {
    personData = ancestryData;
    dataSource = "passed data (ancestry/findagrave)";
    console.log("🎯 USING: Passed clipboard data");
  } else if (familysearchData) {
    personData = familysearchData;
    dataSource = "localStorage (familysearch)";
    console.log("🎯 USING: LocalStorage data (no passed data)");
  } else {
    showNotification("❌ No data found!");
    return;
  }
  
  console.log("🎯 Final data source:", dataSource);
  console.log("🎯 Final person data:", personData);
  
  if (!personData.firstName && !personData.fullName) {
    showNotification("⚠️ personData is empty!");
    return;
  }
  
  // Prepare name data
  if (!personData.firstName || !personData.lastName) {
    const nameParts = (personData.fullName || "").trim().split(/\s+/);
    personData.lastName = nameParts.length > 1 ? nameParts.pop() : "";
    personData.firstName = nameParts.join(" ");
  }
  
  const firstNameWithMiddle = (personData.firstName || "") + 
                              (personData.middleName ? " " + personData.middleName : "");

  const setInput = (element, value) => {
    if (!element || !value) return;
    
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype, 
      'value'
    ).set;
    
    element.focus();
    nativeInputValueSetter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const setDate = (fieldName, value) => new Promise(resolve => {
    if (!value) {
      resolve();
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 30;
    
    const checkForField = setInterval(() => {
      const input = document.querySelector(`input[name='${fieldName}']`);
      
      if (input) {
        clearInterval(checkForField);
        
        input.scrollIntoView({ block: "center" });
        input.focus();
        setInput(input, value);
        
        input.value += "a";
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
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
            resolve();
          } else if (options[0] && autocompleteAttempts > 3) {
            options[0].click();
            clearInterval(checkForAutocomplete);
            resolve();
          }
          
          if (++autocompleteAttempts > 15) {
            clearInterval(checkForAutocomplete);
            resolve();
          }
        }, 100);
      } else if (attempts++ > maxAttempts) {
        clearInterval(checkForField);
        console.warn(`Field ${fieldName} not found`);
        resolve();
      }
    }, 100);
  });

  // Wait for form
  await new Promise(resolve => {
    let attempts = 0;
    const checkForm = setInterval(() => {
      const firstName = document.querySelector("input[data-testid='first-name']");
      if (firstName || attempts++ > 30) {
        clearInterval(checkForm);
        resolve();
      }
    }, 100);
  });

  // Fill basic fields
  setInput(document.querySelector("input[data-testid='first-name']"), firstNameWithMiddle);
  setInput(document.querySelector("input[data-testid='last-name']"), personData.lastName || "");
  
  // Set sex
  if (personData.sex) {
    const sex = personData.sex.toLowerCase() === "male" ? "male" : "female";
    document.querySelectorAll(".radioCss_rw3ic9v").forEach(radio => {
      if (radio.value.toLowerCase() === sex) {
        radio.click();
      }
    });
  }
  
  // Set deceased
  document.querySelectorAll(".radioCss_rw3ic9v").forEach(radio => {
    if (radio.value === "deceased") {
      radio.click();
    }
  });
  
  // Fill dates with timeout protection
  try {
    await Promise.race([
      setDate("birthDate", personData.birthDate),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
    
    await Promise.race([
      setDate("deathDate", personData.deathDate),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
  } catch (e) {
    console.warn("Date filling timed out:", e);
  }
  
  // Fill places
  setInput(document.querySelector("input[name='birthPlace']"), personData.birthplace || "");
  setInput(document.querySelector("input[name='deathPlace']"), personData.deathplace || "");
  
  console.log("✅ Form filled successfully!");
  showNotification(`✅ Filled from: ${dataSource}`);
}

// ========================================
// Fill the add person form
// ========================================
async function fillPersonForm() {
  console.log("📝 Filling person form...");
  
  let clipboardText = "";
  let ancestryData = null;
  let familysearchData = null;
  
  // Try to read clipboard with prompt as backup (same pattern as tool3)
  try {
    clipboardText = await navigator.clipboard.readText();
    console.log("✅ Successfully read clipboard");
    
    if (!clipboardText || clipboardText.trim() === "" || !clipboardText.startsWith("{")) {
      throw new Error("Empty or invalid clipboard");
    }
  } catch (error) {
    // If clipboard fails, prompt user to paste
    console.warn("⚠️ Clipboard read failed, prompting user");
    clipboardText = prompt("Clipboard read failed. Please paste the person data (JSON) here:");
    
    if (!clipboardText || clipboardText.trim() === "") {
      showNotification("❌ No data provided!");
      return;
    }
  }
  
  // Parse the clipboard/pasted data
  if (clipboardText.startsWith("{")) {
    try {
      const parsed = JSON.parse(clipboardText);
      console.log("✅ Successfully parsed JSON");
      console.log("Source:", parsed.source);
      
      if (parsed.source === "ancestry" || parsed.source === "findagrave") {
        ancestryData = parsed;
        console.log("✅ Found clipboard data (timestamp:", ancestryData.timestamp, ")");
      }
    } catch (parseError) {
      console.warn("⚠️ Could not parse JSON:", parseError);
      showNotification("❌ Invalid JSON data!");
      return;
    }
  }
  
  // Check localStorage as fallback
  try {
    const stored = JSON.parse(localStorage.getItem("fs_person_data") || "{}");
    if (stored.firstName || stored.fullName) {
      familysearchData = stored;
      console.log("✅ Found FamilySearch data in localStorage");
    }
  } catch (e) {
    console.warn("No localStorage data found");
  }
  
  // Decision logic - ALWAYS prefer clipboard/pasted data
  let personData = {};
  let dataSource = "none";
  
  if (ancestryData) {
    personData = ancestryData;
    dataSource = "clipboard (ancestry/findagrave)";
    console.log("🎯 USING: Clipboard data");
  } else if (familysearchData) {
    personData = familysearchData;
    dataSource = "localStorage (familysearch)";
    console.log("🎯 USING: LocalStorage data (no clipboard)");
  } else {
    showNotification("❌ No valid data found!");
    return;
  }
  
  console.log("🎯 Final data source:", dataSource);
  console.log("🎯 Final person data:", personData);
  
  if (!personData.firstName && !personData.fullName) {
    showNotification("⚠️ personData is empty!");
    return;
  }
  
  // Prepare name data
  if (!personData.firstName || !personData.lastName) {
    const nameParts = (personData.fullName || "").trim().split(/\s+/);
    personData.lastName = nameParts.length > 1 ? nameParts.pop() : "";
    personData.firstName = nameParts.join(" ");
  }
  
  const firstNameWithMiddle = (personData.firstName || "") + 
                              (personData.middleName ? " " + personData.middleName : "");

  const setInput = (element, value) => {
    if (!element || !value) return;
    
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype, 
      'value'
    ).set;
    
    element.focus();
    nativeInputValueSetter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const setDate = (fieldName, value) => new Promise(resolve => {
    if (!value) {
      resolve();
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 30;
    
    const checkForField = setInterval(() => {
      const input = document.querySelector(`input[name='${fieldName}']`);
      
      if (input) {
        clearInterval(checkForField);
        
        input.scrollIntoView({ block: "center" });
        input.focus();
        setInput(input, value);
        
        input.value += "a";
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
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
            resolve();
          } else if (options[0] && autocompleteAttempts > 3) {
            options[0].click();
            clearInterval(checkForAutocomplete);
            resolve();
          }
          
          if (++autocompleteAttempts > 15) {
            clearInterval(checkForAutocomplete);
            resolve();
          }
        }, 100);
      } else if (attempts++ > maxAttempts) {
        clearInterval(checkForField);
        console.warn(`Field ${fieldName} not found`);
        resolve();
      }
    }, 100);
  });

  // Wait for form
  await new Promise(resolve => {
    let attempts = 0;
    const checkForm = setInterval(() => {
      const firstName = document.querySelector("input[data-testid='first-name']");
      if (firstName || attempts++ > 30) {
        clearInterval(checkForm);
        resolve();
      }
    }, 100);
  });

  // Fill basic fields
  setInput(document.querySelector("input[data-testid='first-name']"), firstNameWithMiddle);
  setInput(document.querySelector("input[data-testid='last-name']"), personData.lastName || "");
  
  // Set sex
  if (personData.sex) {
    const sex = personData.sex.toLowerCase() === "male" ? "male" : "female";
    document.querySelectorAll(".radioCss_rw3ic9v").forEach(radio => {
      if (radio.value.toLowerCase() === sex) {
        radio.click();
      }
    });
  }
  
  // Set deceased
  document.querySelectorAll(".radioCss_rw3ic9v").forEach(radio => {
    if (radio.value === "deceased") {
      radio.click();
    }
  });
  
  // Fill dates with timeout protection
  try {
    await Promise.race([
      setDate("birthDate", personData.birthDate),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
    
    await Promise.race([
      setDate("deathDate", personData.deathDate),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
  } catch (e) {
    console.warn("Date filling timed out:", e);
  }
  
  // Fill places
  setInput(document.querySelector("input[name='birthPlace']"), personData.birthplace || "");
  setInput(document.querySelector("input[name='deathPlace']"), personData.deathplace || "");
  
  console.log("✅ Form filled successfully!");
  showNotification(`✅ Filled from: ${dataSource}`);
}
