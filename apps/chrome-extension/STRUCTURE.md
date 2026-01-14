# Chrome Extension Structure

## Overview
The Chrome extension is now organized with a clean, feature-based folder structure.

## Directory Structure

```
chrome-extension/
├── src/
│   ├── assets/
│   │   └── icons/                    # Extension icons (16, 32, 48, 128px)
│   ├── background/
│   │   └── service-worker.js         # Background service worker (MV3)
│   ├── offscreen/
│   │   ├── offscreen.html            # Offscreen document for media capture
│   │   └── offscreen.js              # Offscreen recording logic
│   ├── recorder-page/
│   │   ├── recorder-page.html        # Full-page recorder UI
│   │   └── recorder-page-init.js     # Page initialization script
│   ├── recorder-overlay/
│   │   ├── overlay-injector.js       # Injects overlay iframe into web pages
│   │   ├── recorder-overlay.html     # Overlay iframe UI
│   │   └── recorder-overlay-init.js  # Overlay initialization + iframe logic
│   └── shared/
│       ├── recorder-controller.js    # Shared RecorderController class
│       └── recorder.css              # Shared styles for both page and overlay
├── scripts/
│   └── build.js                      # Build script
├── manifest.json                     # Extension manifest
└── package.json                      # NPM dependencies
```

## Key Files

### Shared Components
- **`src/shared/recorder-controller.js`** - The `RecorderController` class that handles:
  - Authentication (sign in/out)
  - Device enumeration (cameras/microphones)
  - Permission management
  - UI state management
  - Used by both recorder-page and recorder-overlay
- **`src/shared/recorder.css`** - Shared styles for both page and overlay

### Recorder Page (Full Page)
- **`src/recorder-page/recorder-page.html`** - Full-page recorder interface opened in a new tab
- **`src/recorder-page/recorder-page-init.js`** - Minimal initialization:
  ```javascript
  const recorderController = new RecorderController();
  recorderController.init();
  ```

### Recorder Overlay (Iframe)
- **`src/recorder-overlay/recorder-overlay.html`** - Same UI as page, displayed in iframe on web pages
- **`src/recorder-overlay/recorder-overlay-init.js`** - Initialization + iframe-specific logic:
  - Instantiates `RecorderController`
  - Overrides `requestMediaPermission()` to communicate with parent window
  - Overrides `enumerateDevices()` to request from parent
  - Handles iframe resizing
  - Handles close button
- **`src/recorder-overlay/overlay-injector.js`** - Manages overlay iframe (content script):
  - Injects iframe into web pages
  - Relays messages between overlay and background
  - Handles permission requests from iframe
  - Enumerates devices for iframe

### Background
- **`src/background/service-worker.js`** - Extension background logic:
  - Handles extension icon clicks
  - Manages recording state
  - Communicates with offscreen document
  - Opens popup in new tab when needed

### Offscreen
- **`src/offscreen/offscreen.html`** - Offscreen document for media capture
- **`src/offscreen/offscreen.js`** - Handles actual screen/camera recording

## Architecture Patterns

### Shared Controller Pattern
Both `recorder-page.html` and `recorder-overlay.html` use the same `RecorderController` class from `src/shared/recorder-controller.js`. The overlay overrides specific methods to work within iframe constraints.

### Iframe Communication
The overlay uses `window.parent.postMessage()` to communicate with the content script (`overlay-injector.js`):
- `CAP_REQUEST_PERMISSION` - Request camera/mic permissions
- `CAP_ENUMERATE_DEVICES` - Request device list
- `CAP_RESIZE` - Update iframe height
- `CAP_CLOSE_OVERLAY` - Close the overlay

### HTML Duplication
`recorder-page.html` and `recorder-overlay.html` contain the same UI markup. This is intentional because:
- Chrome extensions have CSP restrictions that prevent dynamic HTML loading
- Each context (full page vs iframe) needs its own HTML file
- The shared `recorder-controller.js` ensures consistent behavior

## Build Process

Run `pnpm build` to:
1. Clean the `dist/` directory
2. Copy `manifest.json` to `dist/`
3. Copy entire `src/` directory to `dist/src/`

The extension loads directly from the `dist/` folder.

## File Naming Conventions

- **HTML files**: `{feature}-{context}.html` (e.g., `recorder-page.html`, `recorder-overlay.html`)
- **CSS files**: `{feature}.css` (e.g., `recorder.css`)
- **Init scripts**: `{feature}-{context}-init.js` (e.g., `recorder-page-init.js`, `recorder-overlay-init.js`)
- **Controllers**: `{feature}-controller.js` (e.g., `recorder-controller.js`)
- **Injectors**: `{purpose}-injector.js` (e.g., `overlay-injector.js`)
- **Background**: `service-worker.js` (MV3 standard)

## Development Workflow

1. Make changes in `src/` directory
2. Run `pnpm build` to copy to `dist/`
3. Load unpacked extension from `dist/` in Chrome
4. Test changes
5. Repeat

## Notes

- The extension uses Manifest V3
- All paths in `manifest.json` are relative to the extension root
- Web accessible resources must be explicitly listed in manifest
- The overlay runs in an iframe with restricted permissions
