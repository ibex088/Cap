# Chrome Extension Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 10+
- Chrome browser (or Chromium-based browser)

## Installation

1. Navigate to the chrome-extension directory:
   ```bash
   cd apps/chrome-extension
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

## Development

### Building the Extension

```bash
pnpm build
```

This creates a `dist/` folder with the compiled extension.

### Watch Mode

For active development with auto-rebuild:

```bash
pnpm dev
```

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `dist/` folder from this directory

### Making Changes

1. Edit source files (`.js`, `.html`, `.css`)
2. If in watch mode, changes rebuild automatically
3. Click the refresh icon on the extension card in `chrome://extensions/`
4. Test your changes

## Adding Icons

The extension needs icons in the following sizes:
- 16x16 (toolbar)
- 32x32 (toolbar retina)
- 48x48 (extension management)
- 128x128 (Chrome Web Store)

Place PNG files in the `icons/` directory with these names:
- `icon-16.png`
- `icon-32.png`
- `icon-48.png`
- `icon-128.png`

You can use the Cap logo from the main app or create custom icons.

## Configuration

### API Endpoint

Update the API base URL in the following files for your environment:

**Development (local):**
```javascript
// popup.js and background.js
const API_BASE_URL = 'http://localhost:3000';
```

**Production:**
```javascript
// popup.js and background.js
const API_BASE_URL = 'https://cap.so';
```

### Extension ID

After publishing to Chrome Web Store, update the extension ID in:
- Web app authentication endpoint
- CORS configuration
- Any hardcoded references

## Testing

### Manual Testing

1. Load the extension in Chrome
2. Click the extension icon
3. Sign in with your Cap account
4. Test each recording mode:
   - Screen recording
   - Tab recording
   - Camera recording
5. Test audio options
6. Test pause/resume
7. Verify upload completes successfully
8. Check that video appears in Cap dashboard

### Testing Checklist

- [ ] Extension loads without errors
- [ ] Authentication flow works
- [ ] Screen recording captures correctly
- [ ] Tab recording captures correctly
- [ ] Camera recording works
- [ ] Microphone audio is captured
- [ ] Pause/resume functions properly
- [ ] Recording timer displays correctly
- [ ] On-page indicator shows during recording
- [ ] Upload progress displays
- [ ] Video appears in Cap dashboard
- [ ] Keyboard shortcut works (Alt+Shift+R)
- [ ] Sign out clears credentials

## Packaging for Distribution

### Create Production Build

```bash
pnpm build
```

### Package as ZIP

```bash
pnpm package
```

This creates `cap-extension.zip` ready for Chrome Web Store submission.

## Publishing to Chrome Web Store

1. Create a developer account at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay the one-time $5 registration fee
3. Click "New Item"
4. Upload `cap-extension.zip`
5. Fill in store listing details:
   - Name: "Cap - Screen Recorder"
   - Description: (see below)
   - Category: Productivity
   - Language: English
6. Upload screenshots and promotional images
7. Set privacy policy URL
8. Submit for review

### Store Listing Description

```
Record your screen, tab, or camera instantly with Cap - the easiest way to create and share video recordings.

Features:
• Screen, tab, and camera recording
• High-quality video and audio
• Pause and resume recording
• Automatic upload to Cap
• Keyboard shortcuts for quick access
• Clean, intuitive interface

Perfect for:
• Creating tutorials and demos
• Recording presentations
• Capturing bugs and issues
• Making video messages
• Documenting workflows

Sign in with your Cap account to get started. No Cap account? Sign up for free at cap.so
```

## Troubleshooting

### Extension won't load
- Check for syntax errors in manifest.json
- Ensure all referenced files exist in dist/
- Check browser console for errors

### Recording doesn't start
- Verify permissions are granted
- Check that getUserMedia is supported
- Look for errors in background service worker console

### Upload fails
- Verify API endpoint is correct
- Check authentication token is valid
- Ensure CORS is configured on server
- Check network tab for failed requests

### Build fails
- Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`
- Check Node.js version: `node --version` (should be 20+)
- Verify all dependencies are installed

## Development Tips

1. **Use Chrome DevTools**: Right-click extension popup → Inspect
2. **Service Worker Console**: Go to `chrome://extensions/` → Click "service worker" link
3. **Reload Extension**: Click refresh icon after changes
4. **Test in Incognito**: Verify permissions work in incognito mode
5. **Check Logs**: Monitor console for errors and warnings

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program-policies/)
