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
// FamilySearch Add New Person Tool (Improved)
// Extracts person data from records and auto-fills the add person form

(async function() {
  try {
    const currentUrl = location.href;
    
    // ============================================
    // ROUTE: Check URL and run appropriate function
    // ============================================
    
    if (currentUrl.includes("familysearch.org/ark:/")) {
      await extractPersonData();
      
    } else if (currentUrl.includes("familysearch.org/en/tree/")) {
      await autoClickAddPerson();
      await fillPersonForm();
      
    } else {
      console.warn("⚠️ This script works on FamilySearch record or tree pages.");
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
    alert("Something went wrong. Check the console for details.");
  }

  // ============================================
  // HELPER: Wait for element to appear
  // ============================================
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found after ${timeout}ms`));
      }, timeout);
    });
  }

  // ============================================
  // HELPER: Simulate real click
  // ============================================
  function realClick(element) {
    element.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));
  }

  // ============================================
  // HELPER: Set input value (bypasses React)
  // ============================================
  function setInputValue(element, value) {
    if (!element || !value) return;
    
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype, 
      'value'
    ).set;
    
    element.focus();
    nativeSetter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ============================================
  // FUNCTION: Extract data from record page
  // ============================================
  async function extractPersonData() {
    console.log("📋 Extracting person data...");
    
    const personData = {};
    
    // Try multiple selector strategies for robustness
    const labelSelectors = [
      ".leftSideCss_lebwza5",
      "[class*='leftSide']",
      "dt" // Sometimes FamilySearch uses definition lists
    ];
    
    let labels = [];
    for (const selector of labelSelectors) {
      labels = document.querySelectorAll(selector);
      if (labels.length > 0) break;
    }
    
    if (labels.length === 0) {
      throw new Error("Could not find person data on this page");
    }
    
    // Extract data from label/value pairs
    labels.forEach(label => {
      const key = label.textContent.toLowerCase().replace(/[^a-z]/g, "");
      const valueContainer = label.nextElementSibling;
      if (!valueContainer) return;
      
      const valueElement = valueContainer.querySelector("strong") || valueContainer;
      const value = valueElement.textContent.trim();
      
      // Map fields
      const fieldMap = {
        'name': 'fullName',
        'sex': 'sex',
        'gender': 'sex',
        'birthdate': 'birthDate',
        'birth': 'birthDate',
        'birthplace': 'birthplace',
        'deathdate': 'deathDate',
        'death': 'deathDate',
        'deathplace': 'deathplace'
      };
      
      if (fieldMap[key]) {
        personData[fieldMap[key]] = value;
      }
    });
    
    // Parse full name into parts
    if (personData.fullName) {
      const nameParts = personData.fullName.split(/\s+/).filter(Boolean);
      if (nameParts.length === 1) {
        personData.firstName = nameParts[0];
        personData.lastName = "";
        personData.middleName = "";
      } else {
        personData.firstName = nameParts[0];
        personData.lastName = nameParts[nameParts.length - 1];
        personData.middleName = nameParts.slice(1, -1).join(" ");
      }
    }
    
    // Store data - try both storage methods for reliability
    const dataString = JSON.stringify(personData);
    try {
      localStorage.setItem("fs_person_data", dataString);
    } catch (e) {
      console.warn("localStorage unavailable, using sessionStorage");
      sessionStorage.setItem("fs_person_data", dataString);
    }
    
    console.log("✅ Extracted:", personData);
    alert(`✅ Data saved for: ${personData.fullName || "Unknown"}\n\nNow navigate to add a new person.`);
  }

  // ============================================
  // FUNCTION: Auto-click "Add Unconnected Person"
  // ============================================
  async function autoClickAddPerson() {
    console.log("🖱️ Looking for Add Person button...");
    
    try {
      // Try to find and click Recents button
      const recentsButton = await waitForElement('button[data-testid="recents-button"]', 3000);
      realClick(recentsButton);
      
      // Wait a moment for menu to open
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Click Add Unconnected Person
      const addButton = await waitForElement('button[data-testid="add-unconnected-person"]', 3000);
      realClick(addButton);
      
      // Wait for form to load
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("✅ Add Person form opened");
      
    } catch (error) {
      console.log("ℹ️ Could not auto-click (maybe already on form page)");
    }
  }

  // ============================================
  // FUNCTION: Fill the add person form
  // ============================================
  async function fillPersonForm() {
    console.log("📝 Filling form...");
    
    // Retrieve stored data (try both storage methods)
    let personData;
    try {
      personData = JSON.parse(
        localStorage.getItem("fs_person_data") || 
        sessionStorage.getItem("fs_person_data") || 
        "{}"
      );
    } catch (e) {
      personData = {};
    }
    
    if (!personData.fullName && !personData.firstName) {
      alert("⚠️ No person data found.\n\nPlease run this bookmarklet on a record page first to extract data.");
      return;
    }
    
    // Ensure we have name parts
    if (!personData.firstName && personData.fullName) {
      const nameParts = personData.fullName.split(/\s+/).filter(Boolean);
      personData.firstName = nameParts[0] || "";
      personData.lastName = nameParts[nameParts.length - 1] || "";
    }
    
    // Build full first name (including middle)
    const fullFirstName = [personData.firstName, personData.middleName]
      .filter(Boolean)
      .join(" ");

    // ============================================
    // Fill basic fields
    // ============================================
    
    const firstNameInput = document.querySelector("input[data-testid='first-name']");
    setInputValue(firstNameInput, fullFirstName);
    
    const lastNameInput = document.querySelector("input[data-testid='last-name']");
    setInputValue(lastNameInput, personData.lastName || "");
    
    // ============================================
    // Set sex/gender radio buttons
    // ============================================
    
    if (personData.sex) {
      const sex = personData.sex.toLowerCase().includes("male") ? "male" : "female";
      const radios = document.querySelectorAll("input[type='radio']");
      
      radios.forEach(radio => {
        if (radio.value && radio.value.toLowerCase() === sex) {
          radio.click();
        }
      });
    }
    
    // ============================================
    // Set living status to deceased
    // ============================================
    
    const radios = document.querySelectorAll("input[type='radio']");
    radios.forEach(radio => {
      if (radio.value === "deceased") {
        radio.click();
      }
    });
    
    // ============================================
    // Fill date fields with improved autocomplete
    // ============================================
    
    const fillDateField = async (fieldName, dateValue) => {
      if (!dateValue) return;
      
      try {
        const input = await waitForElement(`input[name='${fieldName}']`, 2000);
        
        input.scrollIntoView({ block: "center", behavior: "smooth" });
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setInputValue(input, dateValue);
        
        // Wait for autocomplete dropdown
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to click the best autocomplete option
        const options = document.querySelectorAll('[role="option"], [data-testid*="standardized-date"]');
        if (options.length > 1) {
          options[1].click(); // Second option usually more accurate
        } else if (options.length === 1) {
          options[0].click();
        }
        
        console.log(`✅ ${fieldName}: ${dateValue}`);
        
      } catch (error) {
        console.warn(`⚠️ Could not fill ${fieldName}`);
      }
    };
    
    await fillDateField("birthDate", personData.birthDate);
    
    // Fill birthplace
    const birthPlaceInput = document.querySelector("input[name='birthPlace']");
    setInputValue(birthPlaceInput, personData.birthplace || "");
    
    await fillDateField("deathDate", personData.deathDate);
    
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
