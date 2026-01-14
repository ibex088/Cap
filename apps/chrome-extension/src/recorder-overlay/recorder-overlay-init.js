console.log('recorder-overlay-init.js loading...');

const recorderController = new RecorderController();

const closeBtn = document.getElementById('cap-close-overlay');
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    window.parent.postMessage({ type: 'CAP_CLOSE_OVERLAY' }, '*');
  });
}

const pendingPermissionRequests = new Map();

window.addEventListener('message', (event) => {
  if (event.data.type === 'CAP_PERMISSION_RESPONSE') {
    const { messageId, granted, devices } = event.data;
    const resolve = pendingPermissionRequests.get(messageId);

    if (resolve) {
      pendingPermissionRequests.delete(messageId);
      resolve({ granted, devices: devices || [] });
    }
  } else if (event.data.type === 'CAP_DEVICES_ENUMERATED') {
    const cameras = event.data.cameras || [];
    const mics = event.data.mics || [];

    recorderController.availableCameras = cameras;
    recorderController.availableMics = mics;

    if (cameras.length > 0 && cameras[0].label) {
      recorderController.cameraPermissionState = 'granted';
    }

    if (mics.length > 0 && mics[0].label) {
      recorderController.micPermissionState = 'granted';
    }

    recorderController.updateDeviceSelectors();
    recorderController.updatePermissionUI();
  }
});

recorderController.requestMediaPermission = async function (kind) {
  return new Promise((resolve) => {
    const messageId = `permission_${kind}_${Date.now()}`;

    pendingPermissionRequests.set(messageId, resolve);

    window.parent.postMessage({
      type: 'CAP_REQUEST_PERMISSION',
      kind,
      messageId
    }, '*');

    setTimeout(() => {
      if (pendingPermissionRequests.has(messageId)) {
        pendingPermissionRequests.delete(messageId);
        resolve({ granted: false, devices: [] });
      }
    }, 30000);
  }).then(result => {
    if (result.granted) {
      if (kind === 'camera') {
        this.cameraPermissionState = 'granted';
        if (result.devices && result.devices.length > 0) {
          this.availableCameras = result.devices;
          this.updateDeviceSelectors();
        }
      } else {
        this.micPermissionState = 'granted';
        if (result.devices && result.devices.length > 0) {
          this.availableMics = result.devices;
          this.updateDeviceSelectors();
        }
      }
      this.updatePermissionUI();
      return true;
    } else {
      if (kind === 'camera') {
        this.cameraPermissionState = 'denied';
      } else {
        this.micPermissionState = 'denied';
      }
      this.updatePermissionUI();
      return false;
    }
  });
};

recorderController.enumerateDevices = async function () {
  window.parent.postMessage({ type: 'CAP_ENUMERATE_DEVICES' }, '*');
};

function updateIframeHeight() {
  const height = document.body.scrollHeight;
  window.parent.postMessage({ type: 'CAP_RESIZE', height }, '*');
}

const resizeObserver = new ResizeObserver(() => {
  updateIframeHeight();
});

resizeObserver.observe(document.body);

setTimeout(updateIframeHeight, 100);

async function init() {
  await recorderController.init();
}

init();
