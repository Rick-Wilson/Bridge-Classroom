# BBO Convention Card Chrome Extension

## Overview

A Chrome extension that enables importing convention cards from BBO (Bridge Base Online) into the Bridge Classroom convention card editor, and exporting cards back to BBO.

## Goals

1. **Import from BBO** — Extract convention card data from BBO's interface
2. **Export to BBO** — Push card data back to BBO
3. **Sync** — Keep cards synchronized between systems
4. **Minimal Friction** — One-click import/export

## User Experience

### Import Flow
```
1. User is logged into BBO in Chrome
2. User navigates to their convention card in BBO
3. User clicks extension icon
4. Extension reads card data from BBO page
5. Extension opens Bridge Classroom card editor with data pre-filled
6. User reviews and saves
```

### Export Flow
```
1. User has a card in Bridge Classroom
2. User clicks "Export to BBO" in card editor
3. Extension opens BBO convention card page
4. Extension fills in BBO form fields from card data
5. User reviews and saves in BBO
```

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Chrome Extension                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Popup (popup.html)                                      │   │
│  │  • Import/Export buttons                                 │   │
│  │  • Status display                                        │   │
│  │  • Link to card editor                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Content Script (bbo-content.js)                         │   │
│  │  • Injected into BBO pages                               │   │
│  │  • Reads form fields / DOM                               │   │
│  │  • Writes form fields for export                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Background Script (background.js)                       │   │
│  │  • Coordinates between popup and content script          │   │
│  │  • Handles messaging                                     │   │
│  │  • Storage management                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           │                                    │
           │ Read/Write DOM                     │ Open new tab
           ▼                                    ▼
┌─────────────────────────┐    ┌─────────────────────────────────┐
│  BBO Website            │    │  Bridge Classroom Card Editor   │
│  www.bridgebase.com     │    │  cards.harmonicsystems.com      │
│  Convention Card Page   │    │                                 │
└─────────────────────────┘    └─────────────────────────────────┘
```

---

## Extension Structure

```
bbo-card-sync/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/
│   ├── bbo-reader.js      # Read card data from BBO
│   └── bbo-writer.js      # Write card data to BBO
├── background/
│   └── background.js
├── lib/
│   ├── card-mapper.js     # BBO ↔ Bridge Classroom format conversion
│   └── storage.js         # Chrome storage utilities
├── icons/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

---

## Manifest (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "BBO Convention Card Sync",
  "description": "Import and export convention cards between BBO and Bridge Classroom",
  "version": "1.0.0",
  
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  
  "host_permissions": [
    "https://www.bridgebase.com/*",
    "https://cards.harmonicsystems.com/*"
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  
  "content_scripts": [
    {
      "matches": ["https://www.bridgebase.com/*"],
      "js": ["content/bbo-reader.js", "content/bbo-writer.js"],
      "run_at": "document_idle"
    }
  ],
  
  "background": {
    "service_worker": "background/background.js"
  },
  
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

---

## BBO Convention Card Structure

BBO's convention card is rendered as an HTML form. We need to map their field IDs to our data model.

### BBO URL Patterns
```
Convention Card Editor:
https://www.bridgebase.com/v3/?cc=edit

Convention Card Viewer:
https://www.bridgebase.com/v3/?cc=view&u=<username>

Convention Card in Profile:
https://www.bridgebase.com/v3/profile?u=<username> (card tab)
```

### BBO Field Mapping (Partial - needs reverse engineering)

```javascript
// BBO uses form fields and checkboxes
// Field IDs may vary - this needs verification by inspecting BBO's DOM

const BBO_FIELD_MAP = {
  // General
  'general_system': 'general.system',
  
  // Notrump
  'nt1_min': 'notrump.one_nt.range_min',
  'nt1_max': 'notrump.one_nt.range_max',
  'nt1_5cm': 'notrump.one_nt.five_card_major',
  'stayman': 'notrump.stayman.forcing',
  'jacoby_transfers': 'notrump.transfers.jacoby',
  'texas_transfers': 'notrump.transfers.texas',
  
  // Major Openings
  '5cm': 'major_openings.five_card_majors',
  '1nt_forcing': 'major_openings.one_nt_response.forcing',
  '2over1_gf': 'major_openings.two_over_one.game_force',
  'jacoby_2nt': 'major_openings.jacoby_2nt.play',
  'splinters': 'major_openings.splinters.play',
  'drury': 'major_openings.drury.play',
  'reverse_drury': 'major_openings.drury.reverse',
  
  // Two-Level
  '2c_strong': 'two_level.two_clubs.meaning',
  '2d_weak': 'two_level.two_diamonds.meaning',
  '2h_weak': 'two_level.two_hearts.meaning',
  '2s_weak': 'two_level.two_spades.meaning',
  'ogust': 'two_level.ogust.play',
  
  // Slam
  'blackwood': 'other_conventions.blackwood.standard',
  'rkcb': 'other_conventions.blackwood.rkcb_1430',
  'gerber': 'other_conventions.gerber.play',
  
  // Competitive
  'neg_dbl_thru': 'competitive.negative_doubles.through',
  'michaels': 'competitive.michaels.play',
  'unusual_2nt': 'competitive.unusual_2nt.play',
  
  // Leads & Signals
  'lead_4th': 'defensive.opening_leads.vs_suits.fourth_best',
  'lead_3rd5th': 'defensive.opening_leads.vs_suits.third_fifth',
  'attitude_std': 'defensive.signals.attitude.standard',
  'attitude_udca': 'defensive.signals.attitude.upside_down',
  'count_std': 'defensive.signals.count.standard',
  'count_udca': 'defensive.signals.count.upside_down'
}
```

---

## Content Script: BBO Reader (bbo-reader.js)

```javascript
// Content script injected into BBO pages
// Reads convention card data from the DOM

(function() {
  'use strict';
  
  // Check if we're on a convention card page
  function isConventionCardPage() {
    const url = window.location.href;
    return url.includes('cc=edit') || 
           url.includes('cc=view') ||
           document.querySelector('.convention-card') !== null;
  }
  
  // Read all card data from the page
  function readCardData() {
    const card = {
      version: '1.0',
      format: 'bbo',
      source: 'bbo_import',
      imported_at: new Date().toISOString(),
      raw: {},
      mapped: {}
    };
    
    // Read text inputs
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
      if (input.id || input.name) {
        card.raw[input.id || input.name] = input.value;
      }
    });
    
    // Read checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      if (checkbox.id || checkbox.name) {
        card.raw[checkbox.id || checkbox.name] = checkbox.checked;
      }
    });
    
    // Read select dropdowns
    document.querySelectorAll('select').forEach(select => {
      if (select.id || select.name) {
        card.raw[select.id || select.name] = select.value;
      }
    });
    
    // Read radio buttons
    document.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
      if (radio.name) {
        card.raw[radio.name] = radio.value;
      }
    });
    
    // Map to our format
    card.mapped = mapBBOToClassroom(card.raw);
    
    return card;
  }
  
  // Map BBO fields to Bridge Classroom format
  function mapBBOToClassroom(bboData) {
    const mapped = {
      metadata: {
        source: 'bbo',
        imported_at: new Date().toISOString()
      },
      general: {},
      notrump: {
        one_nt: {},
        two_nt: {},
        stayman: {},
        transfers: {}
      },
      major_openings: {
        one_nt_response: {},
        two_over_one: {},
        raises: {},
        jacoby_2nt: {},
        splinters: {},
        drury: {}
      },
      minor_openings: {},
      two_level: {
        two_clubs: {},
        two_diamonds: {},
        two_hearts: {},
        two_spades: {},
        ogust: {}
      },
      other_conventions: {
        blackwood: {},
        gerber: {}
      },
      competitive: {
        overcalls: {},
        takeout_doubles: {},
        negative_doubles: {},
        michaels: {},
        unusual_2nt: {}
      },
      defensive: {
        opening_leads: {
          vs_suits: {},
          vs_nt: {}
        },
        signals: {
          attitude: {},
          count: {},
          suit_preference: {}
        },
        discards: {}
      }
    };
    
    // Apply mappings
    for (const [bboField, classroomPath] of Object.entries(BBO_FIELD_MAP)) {
      if (bboData.hasOwnProperty(bboField)) {
        setNestedValue(mapped, classroomPath, bboData[bboField]);
      }
    }
    
    return mapped;
  }
  
  // Helper to set nested object value from dot-notation path
  function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  
  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'readCard') {
      if (!isConventionCardPage()) {
        sendResponse({ 
          success: false, 
          error: 'Not on a BBO convention card page' 
        });
        return;
      }
      
      try {
        const cardData = readCardData();
        sendResponse({ success: true, card: cardData });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
    
    if (request.action === 'checkPage') {
      sendResponse({ 
        isCardPage: isConventionCardPage(),
        url: window.location.href
      });
    }
    
    return true; // Keep message channel open for async response
  });
  
  // Notify background script that content script is loaded
  chrome.runtime.sendMessage({ action: 'contentScriptReady', url: window.location.href });
  
})();
```

---

## Content Script: BBO Writer (bbo-writer.js)

```javascript
// Content script for writing card data to BBO forms

(function() {
  'use strict';
  
  // Map Bridge Classroom format back to BBO fields
  function mapClassroomToBBO(classroomData) {
    const bboData = {};
    
    // Reverse the mapping
    for (const [bboField, classroomPath] of Object.entries(BBO_FIELD_MAP)) {
      const value = getNestedValue(classroomData, classroomPath);
      if (value !== undefined) {
        bboData[bboField] = value;
      }
    }
    
    return bboData;
  }
  
  // Helper to get nested object value from dot-notation path
  function getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }
  
  // Fill in BBO form with card data
  function writeCardData(classroomCard) {
    const bboData = mapClassroomToBBO(classroomCard);
    const results = { success: [], failed: [] };
    
    for (const [fieldId, value] of Object.entries(bboData)) {
      try {
        // Try by ID first
        let element = document.getElementById(fieldId);
        
        // Try by name if ID not found
        if (!element) {
          element = document.querySelector(`[name="${fieldId}"]`);
        }
        
        if (!element) {
          results.failed.push({ field: fieldId, reason: 'Element not found' });
          continue;
        }
        
        // Set value based on element type
        if (element.type === 'checkbox') {
          element.checked = Boolean(value);
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (element.type === 'radio') {
          const radio = document.querySelector(`[name="${fieldId}"][value="${value}"]`);
          if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else if (element.tagName === 'SELECT') {
          element.value = value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        results.success.push(fieldId);
      } catch (error) {
        results.failed.push({ field: fieldId, reason: error.message });
      }
    }
    
    return results;
  }
  
  // Listen for write requests
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'writeCard') {
      try {
        const results = writeCardData(request.card);
        sendResponse({ 
          success: true, 
          results,
          message: `Set ${results.success.length} fields, ${results.failed.length} failed`
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
    
    return true;
  });
  
})();
```

---

## Popup UI (popup.html)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 320px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    }
    
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .header img {
      width: 32px;
      height: 32px;
      margin-right: 12px;
    }
    
    .header h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    .status {
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    
    .status.info {
      background: #e3f2fd;
      color: #1565c0;
    }
    
    .status.success {
      background: #e8f5e9;
      color: #2e7d32;
    }
    
    .status.error {
      background: #ffebee;
      color: #c62828;
    }
    
    .status.warning {
      background: #fff3e0;
      color: #ef6c00;
    }
    
    .actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    button {
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    button.primary {
      background: #1976d2;
      color: white;
    }
    
    button.primary:hover {
      background: #1565c0;
    }
    
    button.secondary {
      background: #f5f5f5;
      color: #333;
    }
    
    button.secondary:hover {
      background: #e0e0e0;
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .divider {
      height: 1px;
      background: #e0e0e0;
      margin: 16px 0;
    }
    
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    
    .footer a {
      color: #1976d2;
      text-decoration: none;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
    
    .icon {
      width: 18px;
      height: 18px;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="../icons/icon-32.png" alt="Logo">
    <h1>BBO Card Sync</h1>
  </div>
  
  <div id="status" class="status info">
    Checking page...
  </div>
  
  <div class="actions">
    <button id="importBtn" class="primary" disabled>
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Import from BBO
    </button>
    
    <button id="exportBtn" class="secondary" disabled>
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Export to BBO
    </button>
  </div>
  
  <div class="divider"></div>
  
  <div class="actions">
    <button id="openEditorBtn" class="secondary">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
      Open Card Editor
    </button>
  </div>
  
  <div class="divider"></div>
  
  <div class="footer">
    <a href="https://cards.harmonicsystems.com" target="_blank">Bridge Classroom Cards</a>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

---

## Popup Script (popup.js)

```javascript
// Popup script - handles user interactions

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const importBtn = document.getElementById('importBtn');
  const exportBtn = document.getElementById('exportBtn');
  const openEditorBtn = document.getElementById('openEditorBtn');
  
  // Check current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isBBOPage = tab.url.includes('bridgebase.com');
  
  if (isBBOPage) {
    // Check if it's a convention card page
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkPage' });
      
      if (response.isCardPage) {
        statusEl.className = 'status success';
        statusEl.textContent = '✓ BBO Convention Card detected';
        importBtn.disabled = false;
      } else {
        statusEl.className = 'status warning';
        statusEl.textContent = 'Navigate to a convention card in BBO to import';
      }
    } catch (error) {
      statusEl.className = 'status warning';
      statusEl.textContent = 'Navigate to a convention card in BBO to import';
    }
  } else {
    statusEl.className = 'status info';
    statusEl.textContent = 'Open BBO to import a convention card';
  }
  
  // Check if we have a card to export
  const stored = await chrome.storage.local.get('pendingExport');
  if (stored.pendingExport && isBBOPage) {
    exportBtn.disabled = false;
  }
  
  // Import button handler
  importBtn.addEventListener('click', async () => {
    importBtn.disabled = true;
    statusEl.className = 'status info';
    statusEl.textContent = 'Reading card data...';
    
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'readCard' });
      
      if (response.success) {
        // Store card data
        await chrome.storage.local.set({ importedCard: response.card });
        
        // Open card editor with import flag
        const editorUrl = `https://cards.harmonicsystems.com/import?source=bbo`;
        chrome.tabs.create({ url: editorUrl });
        
        statusEl.className = 'status success';
        statusEl.textContent = '✓ Card imported! Opening editor...';
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      statusEl.className = 'status error';
      statusEl.textContent = `Error: ${error.message}`;
      importBtn.disabled = false;
    }
  });
  
  // Export button handler
  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    statusEl.className = 'status info';
    statusEl.textContent = 'Writing card data to BBO...';
    
    try {
      const stored = await chrome.storage.local.get('pendingExport');
      
      if (!stored.pendingExport) {
        throw new Error('No card to export');
      }
      
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'writeCard',
        card: stored.pendingExport
      });
      
      if (response.success) {
        // Clear pending export
        await chrome.storage.local.remove('pendingExport');
        
        statusEl.className = 'status success';
        statusEl.textContent = `✓ ${response.message}`;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      statusEl.className = 'status error';
      statusEl.textContent = `Error: ${error.message}`;
      exportBtn.disabled = false;
    }
  });
  
  // Open editor button handler
  openEditorBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://cards.harmonicsystems.com' });
  });
});
```

---

## Background Script (background.js)

```javascript
// Background service worker

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentScriptReady') {
    console.log('Content script ready on:', request.url);
  }
  
  return true;
});

// Handle external messages from card editor website
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  // Verify sender is our card editor
  if (!sender.origin.includes('cards.harmonicsystems.com')) {
    sendResponse({ success: false, error: 'Unauthorized origin' });
    return;
  }
  
  if (request.action === 'getImportedCard') {
    // Card editor requesting imported data
    chrome.storage.local.get('importedCard', (result) => {
      if (result.importedCard) {
        sendResponse({ success: true, card: result.importedCard });
        // Clear after retrieval
        chrome.storage.local.remove('importedCard');
      } else {
        sendResponse({ success: false, error: 'No imported card' });
      }
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'prepareExport') {
    // Card editor preparing a card for export to BBO
    chrome.storage.local.set({ pendingExport: request.card }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'openBBOCardEditor') {
    // Open BBO convention card editor
    chrome.tabs.create({ 
      url: 'https://www.bridgebase.com/v3/?cc=edit' 
    }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }
});

// Install/update handling
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First install - open welcome page
    chrome.tabs.create({ 
      url: 'https://cards.harmonicsystems.com/extension-welcome' 
    });
  }
});
```

---

## Card Editor Integration

The card editor website needs to communicate with the extension:

### Check if Extension is Installed
```javascript
// In card editor website
async function checkExtensionInstalled() {
  const extensionId = 'your-extension-id-here'; // From Chrome Web Store
  
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(extensionId, { action: 'ping' }, (response) => {
        resolve(!!response);
      });
    } catch {
      resolve(false);
    }
  });
}
```

### Retrieve Imported Card
```javascript
// In card editor website - on /import page
async function getImportedCard() {
  const extensionId = 'your-extension-id-here';
  
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      extensionId,
      { action: 'getImportedCard' },
      (response) => {
        if (response?.success) {
          resolve(response.card);
        } else {
          reject(new Error(response?.error || 'Failed to get card'));
        }
      }
    );
  });
}

// Usage
async function handleImport() {
  try {
    const card = await getImportedCard();
    // Pre-fill editor with card data
    loadCardIntoEditor(card.mapped);
    showNotification('Card imported from BBO!');
  } catch (error) {
    showError('No card to import. Use the extension on a BBO card page.');
  }
}
```

### Trigger Export to BBO
```javascript
// In card editor website
async function exportToBBO(cardData) {
  const extensionId = 'your-extension-id-here';
  
  // First, send card to extension
  await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      extensionId,
      { action: 'prepareExport', card: cardData },
      (response) => {
        if (response?.success) resolve();
        else reject(new Error('Failed to prepare export'));
      }
    );
  });
  
  // Then open BBO card editor
  await new Promise((resolve) => {
    chrome.runtime.sendMessage(
      extensionId,
      { action: 'openBBOCardEditor' },
      resolve
    );
  });
  
  showNotification('BBO opened. Click the extension to fill in your card.');
}
```

---

## Field Mapping Process

Since BBO's exact field IDs may change, we need a process to maintain the mapping:

### 1. Discovery Script
```javascript
// Run in browser console on BBO card page to discover field IDs
(function() {
  const fields = {};
  
  document.querySelectorAll('input, select, textarea').forEach(el => {
    const id = el.id || el.name;
    if (id) {
      fields[id] = {
        tag: el.tagName,
        type: el.type,
        value: el.type === 'checkbox' ? el.checked : el.value,
        label: findLabel(el)
      };
    }
  });
  
  function findLabel(el) {
    // Try to find associated label
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.textContent.trim();
    }
    // Check parent
    const parent = el.closest('label');
    if (parent) return parent.textContent.trim();
    return null;
  }
  
  console.log(JSON.stringify(fields, null, 2));
})();
```

### 2. Mapping Configuration File
Store mappings in a JSON file that can be updated:

```json
{
  "version": "2026-02-01",
  "bbo_version": "v3",
  "mappings": [
    {
      "bbo_field": "nt1_min",
      "bbo_label": "1NT Min",
      "classroom_path": "notrump.one_nt.range_min",
      "type": "number"
    },
    {
      "bbo_field": "stayman_chk",
      "bbo_label": "Stayman",
      "classroom_path": "notrump.stayman.forcing",
      "type": "boolean"
    }
  ]
}
```

### 3. Remote Mapping Updates
Extension could fetch latest mappings from server:

```javascript
// In background.js
async function updateMappings() {
  try {
    const response = await fetch('https://cards.harmonicsystems.com/api/bbo-mappings');
    const mappings = await response.json();
    await chrome.storage.local.set({ bboMappings: mappings });
  } catch (error) {
    console.error('Failed to update mappings:', error);
  }
}

// Check for updates periodically
chrome.alarms.create('updateMappings', { periodInMinutes: 1440 }); // Daily

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateMappings') {
    updateMappings();
  }
});
```

---

## Testing Plan

### Manual Testing
1. Install extension in Chrome developer mode
2. Log into BBO
3. Navigate to convention card
4. Test import → verify data in card editor
5. Edit card in editor
6. Test export → verify data in BBO

### Edge Cases
- BBO not logged in
- Empty convention card
- Partially filled card
- BBO UI changes (field IDs change)
- Network errors
- Extension permissions revoked

### Automated Testing
```javascript
// Jest tests for mapping functions
describe('Card Mapping', () => {
  test('maps BBO fields to Classroom format', () => {
    const bboData = {
      nt1_min: '15',
      nt1_max: '17',
      stayman: true
    };
    
    const result = mapBBOToClassroom(bboData);
    
    expect(result.notrump.one_nt.range_min).toBe('15');
    expect(result.notrump.one_nt.range_max).toBe('17');
    expect(result.notrump.stayman.forcing).toBe(true);
  });
  
  test('maps Classroom format back to BBO', () => {
    const classroomData = {
      notrump: {
        one_nt: { range_min: 15, range_max: 17 },
        stayman: { forcing: true }
      }
    };
    
    const result = mapClassroomToBBO(classroomData);
    
    expect(result.nt1_min).toBe(15);
    expect(result.nt1_max).toBe(17);
    expect(result.stayman).toBe(true);
  });
});
```

---

## Distribution

### Chrome Web Store
1. Create developer account ($5 one-time fee)
2. Package extension as .zip
3. Submit for review
4. Publish

### Manual Installation (Development/Testing)
1. Clone repo
2. Open chrome://extensions
3. Enable Developer Mode
4. Load unpacked → select extension folder

---

## Future Enhancements

1. **Firefox Support** — Port to Firefox Add-ons
2. **Auto-Sync** — Automatically sync when card changes in either system
3. **Conflict Resolution** — Handle cases where cards differ
4. **Multiple Cards** — Support BBO's multiple card feature
5. **Partnership Sync** — Sync both partners' views simultaneously
6. **Offline Support** — Queue exports when BBO unavailable
