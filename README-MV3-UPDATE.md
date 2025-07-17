# Manifest V3 Update for Sorozat Figyelő Extension

This document outlines the changes made to convert the Sorozat Figyelő browser extension from Manifest V2 to Manifest V3, ensuring compatibility with both Chrome and Firefox browsers.

## Major Changes

### 1. Manifest File Updates
- Changed `manifest_version` from 2 to 3
- Replaced `browser_action` with `action`
- Converted `background.scripts` to `background.service_worker`
- Moved host permissions to separate `host_permissions` section
- Added `alarms` permission for periodic tasks
- Added Firefox-specific settings with a gecko ID
- Added content security policy for Manifest V3

### 2. Background Script Changes
- Replaced persistent background page with non-persistent service worker
- Replaced `setInterval` with `chrome.alarms` API for periodic tasks
- Removed DOM-related code (not available in service workers)
- Replaced `localStorage` with `chrome.storage.local` for persistent storage
- Updated `chrome.browserAction` API calls to `chrome.action`
- Added proper initialization on install/update and service worker start
- Improved error handling
- Modernized code with async/await and fetch API

### 3. Popup and Options Scripts
- Replaced `localStorage` with `chrome.storage.local` for consistent storage
- Updated deprecated `chrome.extension.getURL` to `chrome.runtime.getURL`
- Restructured code to handle asynchronous storage operations
- Added better error handling

## Browser Compatibility Notes

### Chrome
- The extension should work as expected in Chrome with Manifest V3 support.
- Chrome's implementation of service workers is more restrictive, but the updated code accounts for this.

### Firefox
- Firefox supports Manifest V3 but with some differences from Chrome.
- Added `browser_specific_settings` with a gecko ID for Firefox compatibility.
- Firefox requires an extension ID for proper installation and updates.

## Testing

Before publishing, test the extension in both Chrome and Firefox to ensure:
1. The badge counter updates correctly
2. Notifications work properly
3. Settings are saved and loaded correctly
4. The UI displays correctly in both browsers
5. All API calls to sorfi.org work as expected

## Version History

- 4.0.2: Last Manifest V2 version
- 4.0.3: First Manifest V3 version with cross-browser compatibility
