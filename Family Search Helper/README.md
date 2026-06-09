# FamilySearch Indexing Helper - Chrome Extension

## Installation Instructions

### Step 1: Create Extension Folder
1. Create a new folder on your computer called `familysearch-helper`
2. Download or create these files inside that folder:
   - `manifest.json`
   - `content.js`
   - `popup.html`
   - `popup.js`
   - `background.js`

### Step 2: Create Icons
You need 3 icon files. You can:
- **Option A:** Create simple colored squares in any image editor (128x128, 48x48, 16x16 pixels)
- **Option B:** Use this online tool: https://www.favicon-generator.org/
- Save them as: `icon128.png`, `icon48.png`, `icon16.png` in the same folder

### Step 3: Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select your `familysearch-helper` folder
5. The extension should now appear in your extensions list!

### Step 4: Pin the Extension
1. Click the puzzle piece icon in Chrome toolbar
2. Find "FamilySearch Indexing Helper"
3. Click the pin icon to keep it visible

---

## How It Works

### Automatic Features (always running in background):

**1. Auto Filter**
- **Where:** FamilySearch search record pages (`/en/search/record/`)
- **What:** Hides chunks that are already attached to people
- **When:** Runs when page loads and when you refocus the tab

**2. Auto Extract Data**
- **Where:** FamilySearch ARK pages, Ancestry, FindAGrave
- **What:** Automatically captures person data (name, dates, places)
- **When:** Runs as soon as you visit these pages

**3. Auto Fill Forms**
- **Where:** FamilySearch tree pages (`/en/tree/`)
- **What:** Detects when "Add Person" popup opens and auto-fills it
- **When:** 2 seconds after popup appears (to let form load)

### Manual Controls:

Click the extension icon to:
- **Toggle any auto feature on/off** using the switches
- **Manually trigger** any function using the buttons
- Check status messages

---

## Features in Detail

### Filter Tool
- Scans all table rows for "already attached" indicators
- Hides rows without matches
- Shows subtle notification with count

### Data Extraction
- **FamilySearch ARK pages:** Extracts from detail sections
- **Ancestry:** Pulls from profile cards (birth/death sections)
- **FindAGrave:** Grabs from memorial page elements
- Stores most recent data (timestamped)
- Shows notification when data is saved

### Auto Fill
- Watches for popup dialogs with person forms
- Waits 2 seconds for full form load
- Fills: first name, middle name, last name, sex, birth/death dates & places
- Auto-clicks date standardization options
- Shows success notification

---

## Troubleshooting

**Extension not working:**
- Make sure you're on the correct website (FamilySearch, Ancestry, or FindAGrave)
- Check that the specific feature is enabled in the popup
- Try manually triggering the action from the popup

**Auto-fill not triggering:**
- Make sure "Auto Fill Forms" is enabled
- The extension waits 2 seconds - be patient
- Try clicking "Fill Form Now" manually

**Data not saving:**
- Data only persists during your browser session
- If browser closes, data is cleared (this is intentional)

**Need to adjust timing:**
- Currently set to 2 seconds for popup detection
- Can be increased in `content.js` if needed (line ~282)

---

## Future Features (mentioned in discussion):
- Auto Find feature (navigate using person ID)
- Custom timing adjustments
- Additional site support

---

## Notes
- This extension only stores data in your **session** (cleared when browser closes)
- All processing happens locally in your browser
- No data is sent to external servers
- Extension requires Chrome Web Store developer fee ($5) if you want to publish it publicly