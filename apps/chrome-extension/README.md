# Cap Chrome Extension

A Chrome extension for Cap that enables instant screen, tab, and camera recording directly from your browser.

## Features

- **Multiple Recording Modes**
  - Screen recording (entire screen or specific window)
  - Tab recording (current browser tab)
  - Camera recording (webcam only)

- **Recording Controls**
  - Start/stop recording with keyboard shortcut (Alt+Shift+R)
  - Pause/resume during recording
  - Real-time recording timer
  - On-page recording indicator

- **Audio Options**
  - Optional microphone audio
  - System audio capture (for tab recording)
  - High-quality audio encoding

- **Seamless Integration**
  - Automatic upload to Cap
  - Direct link to recorded video
  - Progress tracking during upload
  - Multipart upload for large files

## Installation

### From Source

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build the extension:
   ```bash
   pnpm build
   ```

3. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder

### Development Mode

Run the extension in watch mode for development:

```bash
pnpm dev
```

This will automatically rebuild when you make changes to the source files.

## Usage

### First Time Setup

1. Click the Cap extension icon in your browser toolbar
2. Click "Sign In to Cap" to authenticate
3. You'll be redirected to Cap's authentication page
4. Once authenticated, you're ready to record!

### Recording

1. Click the Cap extension icon
2. Select your recording mode (Screen, Tab, or Camera)
3. Configure audio options:
   - Enable/disable microphone
   - Enable/disable camera overlay
4. Click "Start Recording"
5. Grant necessary permissions when prompted
6. Record your content
7. Click "Stop" when finished
8. Your recording will automatically upload to Cap

### Keyboard Shortcuts

- **Alt+Shift+R** (Mac/Windows/Linux): Start/stop recording

## Architecture

### Components

- **`manifest.json`**: Extension configuration and permissions
- **`popup.html/js/css`**: Extension popup UI and controls
- **`background.js`**: Service worker handling recording logic and API communication
- **`content.js`**: Content script for on-page recording indicator
- **`offscreen.html/js`**: Offscreen document for media capture

### Recording Flow

1. User initiates recording from popup
2. Background service worker requests media stream
3. Offscreen document captures and records the stream
4. MediaRecorder API generates video chunks
5. On stop, chunks are combined and uploaded via multipart upload
6. Progress updates are sent to popup and content script
7. User receives link to recorded video

### API Integration

The extension integrates with Cap's existing API endpoints:

- **`/api/desktop/video/create`**: Create video metadata
- **`/api/upload/multipart/initiate`**: Start multipart upload
- **`/api/upload/multipart/presign-part`**: Get presigned URLs for chunks
- **`/api/upload/multipart/complete`**: Finalize upload

## Development

### Project Structure

```
apps/chrome-extension/
├── manifest.json          # Extension manifest
├── popup.html            # Popup UI
├── popup.css             # Popup styles
├── popup.js              # Popup logic
├── background.js         # Service worker
├── content.js            # Content script
├── offscreen.html        # Offscreen document
├── offscreen.js          # Recording logic
├── icons/                # Extension icons
├── scripts/              # Build scripts
│   ├── build.js         # Build script
│   └── package.js       # Packaging script
├── package.json          # Dependencies
└── README.md            # This file
```

### Building for Production

1. Build the extension:
   ```bash
   pnpm build
   ```

2. Package for distribution:
   ```bash
   pnpm package
   ```

This creates `cap-extension.zip` ready for Chrome Web Store submission.

### Adding New Features

1. Update the appropriate component file
2. If adding new permissions, update `manifest.json`
3. Test thoroughly in development mode
4. Build and test the production version

## Browser Compatibility

- Chrome 100+
- Edge 100+
- Other Chromium-based browsers

## Permissions

The extension requires the following permissions:

- **`storage`**: Store authentication tokens and user preferences
- **`tabs`**: Access tab information for tab recording
- **`activeTab`**: Capture current tab content
- **`scripting`**: Inject content script for recording indicator
- **`offscreen`**: Create offscreen document for media capture

## Privacy

- All recordings are processed locally in your browser
- Videos are uploaded directly to your Cap account
- No data is sent to third parties
- Authentication tokens are stored securely in Chrome's storage

## Troubleshooting

### Recording doesn't start
- Ensure you've granted necessary permissions
- Check that you're signed in to Cap
- Try refreshing the page and restarting the recording

### Upload fails
- Check your internet connection
- Verify you're still authenticated
- Try recording a shorter video first

### Audio not captured
- Grant microphone permissions when prompted
- Check your system audio settings
- Ensure microphone is enabled in extension settings

## Contributing

Contributions are welcome! Please follow the existing code style and test thoroughly before submitting PRs.

## License

See the main Cap repository for license information.
