let overlayIframe = null;
let overlayBackdrop = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SHOW_OVERLAY':
      showOverlay();
      break;

    case 'HIDE_OVERLAY':
      hideOverlay();
      break;

    case 'RECORDING_STARTED':
      notifyOverlay({ type: 'RECORDING_STARTED' });
      break;
    
    case 'RECORDING_STOPPED':
      notifyOverlay({ type: 'RECORDING_STOPPED' });
      break;
    
    case 'UPLOAD_PROGRESS':
      notifyOverlay({
        type: 'UPLOAD_PROGRESS',
        progress: message.progress,
        status: message.status
      });
      break;
  }
});

window.addEventListener('message', async (event) => {
  if (event.data.type === 'CAP_CLOSE_OVERLAY') {
    hideOverlay();
  } else if (event.data.type === 'CAP_RESIZE' && overlayIframe) {
    overlayIframe.style.height = `${event.data.height}px`;
  } else if (event.data.type === 'CAP_REQUEST_PERMISSION') {
    const { kind, messageId } = event.data;
    let granted = false;
    let devices = [];

    try {
      const constraints = kind === 'camera'
        ? { video: true, audio: false }
        : { audio: true, video: false };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach(track => track.stop());
      granted = true;

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      devices = allDevices.filter(d =>
        kind === 'camera' ? d.kind === 'videoinput' : d.kind === 'audioinput'
      ).map(d => ({
        deviceId: d.deviceId,
        label: d.label,
        kind: d.kind
      }));
    } catch (error) {
      console.log(`Permission request for ${kind} failed:`, error);
      granted = false;
    }

    if (overlayIframe && overlayIframe.contentWindow) {
      overlayIframe.contentWindow.postMessage({
        type: 'CAP_PERMISSION_RESPONSE',
        messageId,
        granted,
        devices
      }, '*');
    }
  } else if (event.data.type === 'CAP_ENUMERATE_DEVICES') {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = allDevices.filter(d => d.kind === 'videoinput').map(d => ({
        deviceId: d.deviceId,
        label: d.label,
        kind: d.kind
      }));
      const mics = allDevices.filter(d => d.kind === 'audioinput').map(d => ({
        deviceId: d.deviceId,
        label: d.label,
        kind: d.kind
      }));

      if (overlayIframe && overlayIframe.contentWindow) {
        overlayIframe.contentWindow.postMessage({
          type: 'CAP_DEVICES_ENUMERATED',
          cameras,
          mics
        }, '*');
      }
    } catch (error) {
      console.log('Failed to enumerate devices:', error);
    }
  }
});

function showOverlay() {
  if (overlayIframe) return;

  overlayBackdrop = document.createElement('div');
  overlayBackdrop.id = 'cap-overlay-backdrop';
  overlayBackdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2147483646;
    backdrop-filter: blur(4px);
    animation: cap-fade-in 0.15s ease-out;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes cap-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes cap-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  overlayBackdrop.addEventListener('click', () => {
    hideOverlay();
  });

  overlayIframe = document.createElement('iframe');
  overlayIframe.id = 'cap-overlay-iframe';
  overlayIframe.src = chrome.runtime.getURL('src/recorder-overlay/recorder-overlay.html');
  overlayIframe.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 360px;
    height: auto;
    max-height: calc(100vh - 40px);
    border: none;
    z-index: 2147483647;
    pointer-events: auto;
    animation: cap-slide-in 0.2s ease-out;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  `;

  document.body.appendChild(overlayBackdrop);
  document.body.appendChild(overlayIframe);
}

function hideOverlay() {
  if (overlayIframe) {
    overlayIframe.remove();
    overlayIframe = null;
  }
  if (overlayBackdrop) {
    overlayBackdrop.remove();
    overlayBackdrop = null;
  }
}

function notifyOverlay(message) {
  if (overlayIframe && overlayIframe.contentWindow) {
    overlayIframe.contentWindow.postMessage(message, '*');
  }
}
