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
    } else if (currentUrl.includes("familysearch.org/en/tree/")) {
      await autoClickAddPerson();
      await fillPersonForm();
    } else {
      console.log("This script only works on FamilySearch record or tree pages.");
    }
    
  } catch (error) {
    console.error("Error in Add New Person script:", error);
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
    
    localStorage.setItem("fs_person_data", JSON.stringify(personData));
    console.log("✅ Person data saved:", personData);
    alert("✅ Person data extracted! Now navigate to add a new person.");
  }

  // ========================================
  // Auto-click "Add Unconnected Person"
  // ========================================
  async function autoClickAddPerson() {
      //Check if popup is open
    const existingDialog = document.querySelector('[role="dialog"][aria-label="Add Unconnected Person"]');
    if (existingDialog) {
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
    
    const personData = JSON.parse(localStorage.getItem("fs_person_data") || "{}");
    
    if (!personData.firstName && !personData.fullName) {
      alert("⚠️ No person data found. Please run this on a record page first.");
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
    
    await setDate("birthDate", personData.birthDate);
    setInput(document.querySelector("input[name='birthPlace']"), personData.birthplace || "");
    await setDate("deathDate", personData.deathDate);
    
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
