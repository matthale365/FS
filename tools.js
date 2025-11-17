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
// This script extracts person data from a record page and auto-fills it when adding a new person

(async function() {
  try {
    // ============================================
    // HELPER FUNCTION: Simulate real user click
    // ============================================
    function realClick(element) {
      element.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        isTrusted: true
      }));
    }

    // ============================================
    // PART 1: Auto-click "Add Unconnected Person" button
    // ============================================
    let attemptCount = 0;
    
    // First, find and click the "Recents" button
    const findRecentsButton = setInterval(function() {
      const recentsButton = document.querySelector('button[data-testid="recents-button"]');
      
      if (recentsButton) {
        clearInterval(findRecentsButton);
        realClick(recentsButton);
        
        // Then find and click "Add Unconnected Person"
        let addButtonAttempts = 0;
        const findAddButton = setInterval(function() {
          const addButton = document.querySelector('button[data-testid="add-unconnected-person"]');
          
          if (addButton) {
            clearInterval(findAddButton);
            setTimeout(function() {
              realClick(addButton);
            }, 500);
          } else if (addButtonAttempts++ > 40) {
            clearInterval(findAddButton);
          }
        }, 250);
        
      } else if (attemptCount++ > 40) {
        clearInterval(findRecentsButton);
      }
    }, 250);

    // Wait for page transitions
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ============================================
    // HELPER FUNCTION: Normalize text for comparison
    // ============================================
    const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, "");

    const currentUrl = location.href;

    // ============================================
    // PART 2: EXTRACT data from record page (ark:/ URLs)
    // ============================================
    if (currentUrl.includes("familysearch.org/ark:/")) {
      const personData = {};
      
      // Find all label/value pairs on the page
      document.querySelectorAll(".leftSideCss_lebwza5").forEach(label => {
        const key = normalize(label.textContent);
        const valueContainer = label.nextElementSibling;
        
        // Make sure we found the value container
        if (!valueContainer?.classList.contains("rightSideCss_r1y3a6mc")) {
          return;
        }
        
        // Get the actual value text
        const valueElement = valueContainer.querySelector("strong");
        if (!valueElement) return;
        
        const value = valueElement.textContent.trim();
        
        // Map the fields we care about
        if (key === "name") {
          personData.fullName = value;
        } else if (key === "sex") {
          personData.sex = value;
        } else if (key === "birthdate") {
          personData.birthDate = value;
        } else if (key === "birthplace") {
          personData.birthplace = value;
        } else if (key === "deathdate") {
          personData.deathDate = value;
        }
      });
      
      // Split full name into parts
      if (personData.fullName) {
        const nameParts = personData.fullName.split(/\s+/).filter(Boolean);
        personData.firstName = nameParts[0] || "";
        personData.lastName = nameParts[nameParts.length - 1] || "";
        personData.middleName = nameParts.slice(1, -1).join(" ");
      }
      
      // Store in localStorage for later use
      localStorage.setItem("fs_person_data", JSON.stringify(personData));
      return;
    }

    // ============================================
    // PART 3: FILL data into add person form (tree URLs)
    // ============================================
    if (currentUrl.includes("familysearch.org/en/tree/")) {
      // Retrieve stored person data
      const personData = JSON.parse(localStorage.getItem("fs_person_data") || "{}");
      
      // Ensure we have first/last name
      if (!personData.firstName || !personData.lastName) {
        const nameParts = (personData.fullName || "").trim().split(/\s+/);
        personData.lastName = nameParts.length > 1 ? nameParts.pop() : "";
        personData.firstName = nameParts.join(" ");
      }
      
      // Combine first and middle names
      const firstNameWithMiddle = (personData.firstName || "") + 
                                  (personData.middleName ? " " + personData.middleName : "");

      // ============================================
      // HELPER FUNCTION: Set input value programmatically
      // ============================================
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

      // ============================================
      // HELPER FUNCTION: Set date field with autocomplete
      // ============================================
      const setDate = (fieldName, value) => new Promise(resolve => {
        const checkForField = setInterval(() => {
          const input = document.querySelector(`input[name='${fieldName}']`);
          
          if (input) {
            clearInterval(checkForField);
            
            // Scroll to and focus the input
            input.scrollIntoView({ block: "center" });
            input.focus();
            
            // Set the value
            setInput(input, value);
            
            // Trigger autocomplete by typing an extra character
            input.value += "a";
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Reset to correct value
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Wait for and click the autocomplete option
            let autocompleteAttempts = 0;
            const checkForAutocomplete = setInterval(() => {
              const options = Array.from(document.querySelectorAll(
                '[role="option"], [data-testid*="standardized-date"]'
              ));
              
              // Click second option if available (usually more accurate)
              if (options.length > 1) {
                options[1].click();
                clearInterval(checkForAutocomplete);
                resolve();
              } 
              // Otherwise click first option after a few attempts
              else if (options[0] && autocompleteAttempts > 3) {
                options[0].click();
                clearInterval(checkForAutocomplete);
                resolve();
              }
              
              // Give up after 20 attempts
              if (++autocompleteAttempts > 20) {
                clearInterval(checkForAutocomplete);
              }
            }, 100);
          }
        }, 100);
      });

      // ============================================
      // FILL IN ALL THE FORM FIELDS
      // ============================================
      
      // Fill first name (with middle name)
      setInput(
        document.querySelector("input[data-testid='first-name']"), 
        firstNameWithMiddle
      );
      
      // Fill last name
      setInput(
        document.querySelector("input[data-testid='last-name']"), 
        personData.lastName || ""
      );
      
      // Set sex/gender
      if (personData.sex) {
        const sex = personData.sex.toLowerCase() === "male" ? "male" : "female";
        document.querySelectorAll(".radioCss_rw3ic9v").forEach(radio => {
          if (radio.value.toLowerCase() === sex) {
            radio.click();
          }
        });
      }
      
      // Set living status to "deceased"
      document.querySelectorAll(".radioCss_rw3ic9v").forEach(radio => {
        if (radio.value === "deceased") {
          radio.click();
        }
      });
      
      // Fill birth date (with autocomplete)
      await setDate("birthDate", personData.birthDate);
      
      // Fill birth place
      setInput(
        document.querySelector("input[name='birthPlace']"), 
        personData.birthplace || ""
      );
      
      // Fill death date (with autocomplete)
      await setDate("deathDate", personData.deathDate);
    }
    
  } catch (error) {
    console.error("Error in Add New Person script:", error);
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
