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
    alert("Tool 2 is working!");
    // another tool's code
}

function tool3() {
// FamilySearch Auto Find Tool
(async function() {
  try {
    // Read text from the clipboard
    const clipboardText = await navigator.clipboard.readText();
    
    // Check if clipboard has content
    if (!clipboardText) {
      alert("Clipboard is empty!");
      return;
    }
    
    // Navigate to the person's FamilySearch profile page
    // Trims whitespace and encodes the ID for URL safety
    const personId = clipboardText.trim();
    const profileUrl = "https://www.familysearch.org/en/tree/person/details/" + encodeURIComponent(personId);
    
    window.location.href = profileUrl;
    
  } catch (error) {
    // Handle errors (usually permission denied)
    alert("Unable to read clipboard. Please allow clipboard permissions.");
    console.error(error);
  }
})();
}
