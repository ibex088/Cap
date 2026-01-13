console.log('popup.js loading...');

const API_BASE_URL = 'https://cap.so';

let currentMode = 'screen';
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;

const elements = {
  loadingSection: document.getElementById('loading-section'),
  authSection: document.getElementById('auth-section'),
  recordingSection: document.getElementById('recording-section'),
  signInBtn: document.getElementById('sign-in-btn'),
  signOutBtn: document.getElementById('sign-out-btn'),
  userName: document.getElementById('user-name'),
  userAvatar: document.getElementById('user-avatar'),
  modeSelectBtn: document.getElementById('mode-select-btn'),
  modeLabel: document.getElementById('mode-label'),
  modeDropdown: document.getElementById('mode-dropdown'),
  cameraStatus: document.getElementById('camera-status'),
  micStatus: document.getElementById('mic-status'),
  cameraSelectBtn: document.getElementById('camera-select-btn'),
  cameraLabel: document.getElementById('camera-label'),
  cameraDropdown: document.getElementById('camera-dropdown'),
  micSelectBtn: document.getElementById('mic-select-btn'),
  micLabel: document.getElementById('mic-label'),
  micDropdown: document.getElementById('mic-dropdown'),
  startRecordingBtn: document.getElementById('start-recording-btn'),
  recordingControls: document.getElementById('recording-controls'),
  pauseBtn: document.getElementById('pause-btn'),
  stopBtn: document.getElementById('stop-btn'),
  recordingTime: document.getElementById('recording-time'),
  uploadProgress: document.getElementById('upload-progress'),
  uploadStatus: document.getElementById('upload-status'),
  uploadPercent: document.getElementById('upload-percent'),
  progressFill: document.getElementById('progress-fill')
};

let selectedCameraId = null;
let selectedMicId = null;
let availableCameras = [];
let availableMics = [];
let cameraPermissionState = 'prompt';
let micPermissionState = 'prompt';

const NO_CAMERA_VALUE = 'no-camera';
const NO_MIC_VALUE = 'no-microphone';

async function checkMediaPermission(kind) {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unsupported';
  }

  try {
    const permission = await navigator.permissions.query({ name: kind });
    console.log('permissionnnnnnn: ', permission);
    return permission.state;
  } catch (error) {
    console.log(`Permission API not supported for ${kind}:`, error);
    return 'unsupported';
  }
}

async function setupPermissionListener(kind) {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return;
  }

  try {
    const permission = await navigator.permissions.query({ name: kind });

    permission.onchange = () => {
      if (kind === 'camera') {
        cameraPermissionState = permission.state;
      } else {
        micPermissionState = permission.state;
      }
      updatePermissionUI();
    };
  } catch (error) {
    console.log(`Could not setup permission listener for ${kind}`);
  }
}

let permissionTabId = null;

async function requestMediaPermission(kind) {
  try {
    const constraints = kind === 'camera'
      ? { video: true, audio: false }
      : { audio: true, video: false };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach(track => track.stop());

    if (kind === 'camera') {
      cameraPermissionState = 'granted';
    } else {
      micPermissionState = 'granted';
    }

    await refreshPermissionsAndDevices();
    return true;
  } catch (error) {
    console.log(`${kind} permission request in popup failed:`, error);
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      console.log(`${kind} permission denied in popup, opening permission tab...`);
      return await openPermissionTab();
    }
    console.error(`${kind} permission request error:`, error);
    return false;
  }
}

async function openPermissionTab() {
  try {
    if (permissionTabId) {
      try {
        const existingTab = await chrome.tabs.get(permissionTabId);
        if (existingTab) {
          await chrome.tabs.update(permissionTabId, { active: true });
          return true;
        }
      } catch (error) {
        permissionTabId = null;
      }
    }

    const permissionUrl = chrome.runtime.getURL('permission.html');
    const tab = await chrome.tabs.create({ url: permissionUrl, active: true });
    permissionTabId = tab.id;

    chrome.tabs.onRemoved.addListener((tabId) => {
      if (tabId === permissionTabId) {
        permissionTabId = null;
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to open permission tab:', error);
    return false;
  }
}

async function enumerateDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    availableCameras = devices.filter(d => d.kind === 'videoinput' && d.deviceId);
    availableMics = devices.filter(d => d.kind === 'audioinput' && d.deviceId);

    console.log('Available cameras:', availableCameras);
    console.log('Available microphones:', availableMics);

    if (availableCameras.length > 0 && !availableCameras[0].label) {
      console.log('Device IDs present but labels empty - permission may not be fully granted yet');
    }

    updateDeviceSelectors();
  } catch (error) {
    console.error('Failed to enumerate devices:', error);
  }
}

async function refreshPermissionsAndDevices() {
  cameraPermissionState = await checkMediaPermission('camera');
  micPermissionState = await checkMediaPermission('microphone');

  await setupPermissionListener('camera');
  await setupPermissionListener('microphone');

  await enumerateDevices();
  updatePermissionUI();
}

function updatePermissionUI() {
  const shouldRequestCamera = cameraPermissionState !== 'granted' && cameraPermissionState !== 'unsupported';
  const shouldRequestMic = micPermissionState !== 'granted' && micPermissionState !== 'unsupported';

  if (elements.cameraSelectBtn) {
    elements.cameraSelectBtn.disabled = shouldRequestCamera;
  }

  if (elements.micSelectBtn) {
    elements.micSelectBtn.disabled = shouldRequestMic;
  }

  updateStatusPills();
}

function updateStatusPills() {
  const shouldRequestCamera = cameraPermissionState !== 'granted' && cameraPermissionState !== 'unsupported';
  const shouldRequestMic = micPermissionState !== 'granted' && micPermissionState !== 'unsupported';

  const cameraEnabled = selectedCameraId !== null && selectedCameraId !== NO_CAMERA_VALUE;
  const micEnabled = selectedMicId !== null && selectedMicId !== NO_MIC_VALUE;

  if (shouldRequestCamera) {
    elements.cameraStatus.textContent = 'Request permission';
    elements.cameraStatus.classList.remove('on');
    elements.cameraStatus.classList.add('request-permission');
    elements.cameraStatus.disabled = false;
  } else if (cameraEnabled) {
    elements.cameraStatus.textContent = 'On';
    elements.cameraStatus.classList.add('on');
    elements.cameraStatus.classList.remove('request-permission');
    elements.cameraStatus.disabled = false;
  } else {
    elements.cameraStatus.textContent = 'Off';
    elements.cameraStatus.classList.remove('on', 'request-permission');
    elements.cameraStatus.disabled = true;
  }

  if (shouldRequestMic) {
    elements.micStatus.textContent = 'Request permission';
    elements.micStatus.classList.remove('on');
    elements.micStatus.classList.add('request-permission');
    elements.micStatus.disabled = false;
  } else if (micEnabled) {
    elements.micStatus.textContent = 'On';
    elements.micStatus.classList.add('on');
    elements.micStatus.classList.remove('request-permission');
    elements.micStatus.disabled = false;
  } else {
    elements.micStatus.textContent = 'Off';
    elements.micStatus.classList.remove('on', 'request-permission');
    elements.micStatus.disabled = true;
  }
}

function updateDeviceSelectors() {
  if (elements.cameraDropdown) {
    elements.cameraDropdown.innerHTML = `
      <button class="device-option active" data-camera="${NO_CAMERA_VALUE}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 1l22 22M7 7a7 7 0 0 0 10 10M12 5a7 7 0 0 1 7 7v.5"></path>
        </svg>
        <span>No Camera</span>
      </button>
    `;

    availableCameras.forEach((camera, index) => {
      const option = document.createElement('button');
      option.className = 'device-option';
      option.setAttribute('data-camera', camera.deviceId);
      option.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
        <span>${camera.label || `Camera ${index + 1}`}</span>
      `;
      elements.cameraDropdown.appendChild(option);
    });

    updateCameraLabel();
  }

  if (elements.micDropdown) {
    elements.micDropdown.innerHTML = `
      <button class="device-option active" data-mic="${NO_MIC_VALUE}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <span>No Microphone</span>
      </button>
    `;

    availableMics.forEach((mic, index) => {
      const option = document.createElement('button');
      option.className = 'device-option';
      option.setAttribute('data-mic', mic.deviceId);
      option.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <span>${mic.label || `Microphone ${index + 1}`}</span>
      `;
      elements.micDropdown.appendChild(option);
    });

    updateMicLabel();
  }
}

function updateCameraLabel() {
  if (!elements.cameraLabel) return;

  if (!selectedCameraId || selectedCameraId === NO_CAMERA_VALUE) {
    elements.cameraLabel.textContent = 'No Camera';
  } else {
    const camera = availableCameras.find(c => c.deviceId === selectedCameraId);
    const index = availableCameras.indexOf(camera);
    elements.cameraLabel.textContent = camera?.label || `Camera ${index + 1}`;
  }

  document.querySelectorAll('[data-camera]').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-camera') === (selectedCameraId || NO_CAMERA_VALUE)) {
      btn.classList.add('active');
    }
  });
}

function updateMicLabel() {
  if (!elements.micLabel) return;

  if (!selectedMicId || selectedMicId === NO_MIC_VALUE) {
    elements.micLabel.textContent = 'No Microphone';
  } else {
    const mic = availableMics.find(m => m.deviceId === selectedMicId);
    const index = availableMics.indexOf(mic);
    elements.micLabel.textContent = mic?.label || `Microphone ${index + 1}`;
  }

  document.querySelectorAll('[data-mic]').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-mic') === (selectedMicId || NO_MIC_VALUE)) {
      btn.classList.add('active');
    }
  });
}

async function init() {
  const authStatus = await checkAuthStatus();
  
  elements.loadingSection.classList.add('hidden');

  if (authStatus.authenticated) {
    showRecordingSection(authStatus.user);
    await refreshPermissionsAndDevices();
  } else {
    showAuthSection();
  }

  setupEventListeners();
  setupStorageListener();
  checkRecordingState();
}

function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.cameraPermission) {
        const newState = changes.cameraPermission.newValue;
        if (newState === 'granted') {
          cameraPermissionState = 'granted';
          refreshPermissionsAndDevices();
        } else if (newState === 'denied') {
          cameraPermissionState = 'denied';
          updatePermissionUI();
        }
      }

      if (changes.microphonePermission) {
        const newState = changes.microphonePermission.newValue;
        if (newState === 'granted') {
          micPermissionState = 'granted';
          refreshPermissionsAndDevices();
        } else if (newState === 'denied') {
          micPermissionState = 'denied';
          updatePermissionUI();
        }
      }
    }
  });
}

async function checkAuthStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const session = await response.json();
      if (session?.user) {
        await chrome.storage.local.set({ user: session.user });
        return { authenticated: true, user: session.user };
      }
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
  
  return { authenticated: false };
}

function showAuthSection() {
  elements.authSection.classList.remove('hidden');
  elements.recordingSection.classList.add('hidden');
}

function showRecordingSection(user) {
  elements.authSection.classList.add('hidden');
  elements.recordingSection.classList.remove('hidden');
  
  elements.userName.textContent = user.name || user.email;
  elements.userAvatar.textContent = (user.name || user.email).charAt(0).toUpperCase();
}

function setupEventListeners() {
  console.log('setupEventListeners called');

  elements.signInBtn.addEventListener('click', handleSignIn);
  elements.signOutBtn.addEventListener('click', handleSignOut);
  elements.startRecordingBtn.addEventListener('click', handleStartRecording);
  elements.pauseBtn.addEventListener('click', handlePauseRecording);
  elements.stopBtn.addEventListener('click', handleStopRecording);

  elements.modeSelectBtn.addEventListener('click', () => {
    const isOpen = !elements.modeDropdown.classList.contains('hidden');
    elements.modeDropdown.classList.toggle('hidden');
    elements.modeSelectBtn.classList.toggle('open');
  });

  document.querySelectorAll('.mode-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      elements.modeLabel.textContent = btn.querySelector('span').textContent;
      elements.modeDropdown.classList.add('hidden');
      elements.modeSelectBtn.classList.remove('open');
      
      const icon = btn.querySelector('svg').cloneNode(true);
      elements.modeSelectBtn.querySelector('.mode-icon').replaceWith(icon);
      icon.classList.add('mode-icon');
    });
  });

  elements.cameraSelectBtn.addEventListener('click', () => {
    const isOpen = !elements.cameraDropdown.classList.contains('hidden');
    elements.cameraDropdown.classList.toggle('hidden');
    elements.cameraSelectBtn.classList.toggle('open');
    if (!isOpen) {
      elements.micDropdown.classList.add('hidden');
      elements.micSelectBtn.classList.remove('open');
    }
  });

  elements.micSelectBtn.addEventListener('click', () => {
    const isOpen = !elements.micDropdown.classList.contains('hidden');
    elements.micDropdown.classList.toggle('hidden');
    elements.micSelectBtn.classList.toggle('open');
    if (!isOpen) {
      elements.cameraDropdown.classList.add('hidden');
      elements.cameraSelectBtn.classList.remove('open');
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-camera]')) {
      const cameraId = e.target.closest('[data-camera]').getAttribute('data-camera');
      selectedCameraId = cameraId === NO_CAMERA_VALUE ? null : cameraId;
      updateCameraLabel();
      updateStatusPills();
      elements.cameraDropdown.classList.add('hidden');
      elements.cameraSelectBtn.classList.remove('open');
    }

    if (e.target.closest('[data-mic]')) {
      const micId = e.target.closest('[data-mic]').getAttribute('data-mic');
      selectedMicId = micId === NO_MIC_VALUE ? null : micId;
      updateMicLabel();
      updateStatusPills();
      elements.micDropdown.classList.add('hidden');
      elements.micSelectBtn.classList.remove('open');
    }
  });

  elements.cameraStatus.addEventListener('click', async (e) => {
    e.stopPropagation();

    const shouldRequestCamera = cameraPermissionState !== 'granted' && cameraPermissionState !== 'unsupported';

    if (shouldRequestCamera) {
      const originalText = elements.cameraStatus.textContent;
      elements.cameraStatus.textContent = 'Requesting...';
      elements.cameraStatus.disabled = true;

      try {
        await requestMediaPermission('camera');
      } catch (error) {
        console.log('Camera permission request failed or denied');
      }

      elements.cameraStatus.disabled = false;
      if (cameraPermissionState !== 'granted') {
        elements.cameraStatus.textContent = originalText;
      }
      return;
    }

    const cameraEnabled = selectedCameraId !== null && selectedCameraId !== NO_CAMERA_VALUE;
    if (cameraEnabled) {
      selectedCameraId = null;
      updateCameraLabel();
      updateStatusPills();
    }
  });

  elements.micStatus.addEventListener('click', async (e) => {
    e.stopPropagation();

    const shouldRequestMic = micPermissionState !== 'granted' && micPermissionState !== 'unsupported';

    if (shouldRequestMic) {
      const originalText = elements.micStatus.textContent;
      elements.micStatus.textContent = 'Requesting...';
      elements.micStatus.disabled = true;

      try {
        await requestMediaPermission('microphone');
      } catch (error) {
        console.log('Microphone permission request failed or denied');
      }

      elements.micStatus.disabled = false;
      if (micPermissionState !== 'granted') {
        elements.micStatus.textContent = originalText;
      }
      return;
    }

    const micEnabled = selectedMicId !== null && selectedMicId !== NO_MIC_VALUE;
    if (micEnabled) {
      selectedMicId = null;
      updateMicLabel();
      updateStatusPills();
    }
  });

  document.addEventListener('click', (e) => {
    if (!elements.modeSelectBtn.contains(e.target) && !elements.modeDropdown.contains(e.target)) {
      elements.modeDropdown.classList.add('hidden');
      elements.modeSelectBtn.classList.remove('open');
    }

    if (!e.target.closest('.device-selector')) {
      elements.cameraDropdown.classList.add('hidden');
      elements.cameraSelectBtn.classList.remove('open');
      elements.micDropdown.classList.add('hidden');
      elements.micSelectBtn.classList.remove('open');
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    console.log('messageeeeeeee: ', message);
    if (message.type === 'RECORDING_STARTED') {
      onRecordingStarted();
    } else if (message.type === 'RECORDING_STOPPED') {
      onRecordingStopped();
    } else if (message.type === 'UPLOAD_PROGRESS') {
      updateUploadProgress(message.progress, message.status);
    }
  });
}

async function handleSignIn() {
  console.log('API_BASE_URL: ', API_BASE_URL);

  const btnText = elements.signInBtn.querySelector('.btn-text');
  const btnLoader = elements.signInBtn.querySelector('.btn-loader');

  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  elements.signInBtn.disabled = true;

  const authUrl = `${API_BASE_URL}/extension/auth`;
  const tab = await chrome.tabs.create({ url: authUrl });
  
  const checkInterval = setInterval(async () => {
    try {
      const currentTab = await chrome.tabs.get(tab.id);
      if (!currentTab) {
        clearInterval(checkInterval);
        const authStatus = await checkAuthStatus();
        if (authStatus.authenticated) {
          showRecordingSection(authStatus.user);
        } else {
          btnText.classList.remove('hidden');
          btnLoader.classList.add('hidden');
          elements.signInBtn.disabled = false;
        }
      }
    } catch (error) {
      clearInterval(checkInterval);
      const authStatus = await checkAuthStatus();
      if (authStatus.authenticated) {
        showRecordingSection(authStatus.user);
      } else {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        elements.signInBtn.disabled = false;
      }
    }
  }, 1000);
}

async function handleSignOut() {
  try {
    await fetch(`${API_BASE_URL}/api/auth/signout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Sign out failed:', error);
  }
  
  await chrome.storage.local.remove(['user']);
  showAuthSection();
}

async function handleStartRecording() {
  const micEnabled = selectedMicId !== null && selectedMicId !== NO_MIC_VALUE;
  const cameraEnabled = selectedCameraId !== null && selectedCameraId !== NO_CAMERA_VALUE;

  const config = {
    mode: currentMode,
    micEnabled: micEnabled,
    cameraEnabled: cameraEnabled,
    selectedMicId: micEnabled ? selectedMicId : null,
    selectedCameraId: cameraEnabled ? selectedCameraId : null
  };

  try {
    await chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      config
    });
  } catch (error) {
    console.error('Failed to start recording:', error);
    alert('Failed to start recording. Please try again.');
  }
}

async function handlePauseRecording() {
  await chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
}

async function handleStopRecording() {
  await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
}

function onRecordingStarted() {
  isRecording = true;
  recordingStartTime = Date.now();
  
  elements.startRecordingBtn.classList.add('hidden');
  elements.recordingControls.classList.remove('hidden');
  
  startTimer();
}

function onRecordingStopped() {
  isRecording = false;
  stopTimer();
  
  elements.recordingControls.classList.add('hidden');
  elements.startRecordingBtn.classList.remove('hidden');
  elements.uploadProgress.classList.remove('hidden');
}

function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - recordingStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    elements.recordingTime.textContent = 
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  elements.recordingTime.textContent = '00:00';
}

function updateUploadProgress(progress, status) {
  elements.uploadStatus.textContent = status || 'Uploading...';
  elements.uploadPercent.textContent = `${Math.round(progress)}%`;
  elements.progressFill.style.width = `${progress}%`;
  
  if (progress >= 100) {
    setTimeout(() => {
      elements.uploadProgress.classList.add('hidden');
    }, 2000);
  }
}

async function checkRecordingState() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' });
  if (response && response.isRecording) {
    onRecordingStarted();
  }
}

console.log('About to call init()');
init();
