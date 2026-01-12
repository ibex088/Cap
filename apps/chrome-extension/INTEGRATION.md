# Cap Chrome Extension - Integration Guide

This document outlines the integration points between the Chrome extension and the Cap web application.

## Authentication Flow

The extension uses the existing NextAuth session-based authentication - no custom tokens needed! The extension makes API calls with cookies, just like the web app.

### How It Works

1. User clicks "Sign In" in extension popup
2. Extension opens Cap web app in a new tab
3. User signs in normally (if not already signed in)
4. Extension detects successful authentication via cookies
5. Extension can now make authenticated API calls

### Required Web App Changes

**No authentication changes needed!** The extension uses the existing API endpoints with session cookies.

However, you may want to add a simple extension landing page for better UX:

#### Optional: Extension Welcome Page

Create a page that confirms authentication and closes the tab:

```typescript
// apps/web/app/extension/auth/page.tsx
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ExtensionAuthPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setTimeout(() => {
        window.close();
      }, 1500);
    }
  }, [status, session]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connecting to Cap Extension...</h1>
          <p className="text-gray-600">Please wait</p>
        </div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-green-600">✓ Connected!</h1>
          <p className="text-gray-600">You can close this tab and return to the extension.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Sign in to Cap</h1>
        <p className="text-gray-600 mb-4">Please sign in to use the Chrome extension</p>
        <a href="/login" className="text-blue-600 hover:underline">
          Go to Sign In
        </a>
      </div>
    </div>
  );
}
```

## API Endpoints Used

The extension uses the following existing API endpoints:

### 1. Video Creation
- **Endpoint**: `GET /api/desktop/video/create`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: 
  - `recordingMode`: `desktopMP4`
  - `isScreenshot`: `false`
- **Response**: `{ id: string, user_id: string }`

### 2. Multipart Upload Initiation
- **Endpoint**: `POST /api/upload/multipart/initiate`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ videoId: string, contentType: 'video/mp4' }`
- **Response**: `{ uploadId: string }`

### 3. Presigned Part URL
- **Endpoint**: `POST /api/upload/multipart/presign-part`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ videoId: string, uploadId: string, partNumber: number }`
- **Response**: `{ presignedUrl: string }`

### 4. Complete Upload
- **Endpoint**: `POST /api/upload/multipart/complete`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: 
  ```json
  {
    "videoId": "string",
    "uploadId": "string",
    "parts": [
      { "partNumber": 1, "etag": "string", "size": number }
    ]
  }
  ```
- **Response**: `{ location: string, success: true, fileKey: string }`

## CORS Configuration

Ensure the web app allows requests from the Chrome extension:

```typescript
// apps/web/middleware.ts or next.config.js
const corsHeaders = {
  'Access-Control-Allow-Origin': 'chrome-extension://*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## Extension ID

After publishing the extension to the Chrome Web Store, update the following:

1. Add the extension ID to the authentication endpoint
2. Update CORS configuration to include the specific extension ID
3. Add the extension ID to the web app's CSP policy if needed

## Testing

### Local Development

1. Build the extension: `pnpm build`
2. Load unpacked extension in Chrome
3. Update `API_BASE_URL` in extension files to `http://localhost:3000`
4. Test authentication flow
5. Test recording and upload

### Production

1. Deploy web app changes
2. Update extension `API_BASE_URL` to production URL
3. Build and package extension: `pnpm package`
4. Submit to Chrome Web Store

## Security Considerations

1. **Token Security**: Extension tokens are stored in Chrome's local storage, which is isolated per extension
2. **Token Expiration**: Tokens expire after 90 days, requiring re-authentication
3. **HTTPS Only**: All API requests use HTTPS in production
4. **Content Security Policy**: Extension follows strict CSP rules
5. **Permissions**: Extension only requests necessary permissions

## Monitoring

Consider adding analytics for:
- Extension installations
- Recording starts/completions
- Upload success/failure rates
- Average recording duration
- Popular recording modes

## Future Enhancements

1. **Instant Upload**: Stream chunks during recording for faster uploads
2. **Local Storage**: Cache recordings locally if upload fails
3. **Quality Settings**: Allow users to choose video quality
4. **Annotations**: Add drawing tools during recording
5. **Trimming**: Basic video editing before upload
6. **Shortcuts**: Customizable keyboard shortcuts
7. **Teams**: Share recordings with team members directly
