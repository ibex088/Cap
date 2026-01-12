const API_BASE_URL = 'https://cap.so';

let currentMode = 'screen';
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;

const elements = {
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
  cameraPermissionBtn: document.getElementById('camera-permission-btn'),
  micPermissionBtn: document.getElementById('mic-permission-btn'),
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

let micEnabled = false;
let cameraEnabled = false;

async function init() {
  const authStatus = await checkAuthStatus();
  
  if (authStatus.authenticated) {
    showRecordingSection(authStatus.user);
  } else {
    showAuthSection();
  }

  setupEventListeners();
  checkRecordingState();
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

  elements.cameraStatus.addEventListener('click', () => {
    if (cameraEnabled) {
      cameraEnabled = false;
      elements.cameraStatus.textContent = 'Off';
      elements.cameraStatus.classList.remove('on');
    }
  });

  elements.micStatus.addEventListener('click', () => {
    if (micEnabled) {
      micEnabled = false;
      elements.micStatus.textContent = 'Off';
      elements.micStatus.classList.remove('on');
    }
  });

  elements.cameraPermissionBtn.addEventListener('click', async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      cameraEnabled = true;
      elements.cameraStatus.textContent = 'On';
      elements.cameraStatus.classList.add('on');
      elements.cameraPermissionBtn.classList.add('hidden');
    } catch (error) {
      alert('Camera permission denied');
    }
  });

  elements.micPermissionBtn.addEventListener('click', async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      micEnabled = true;
      elements.micStatus.textContent = 'On';
      elements.micStatus.classList.add('on');
      elements.micPermissionBtn.classList.add('hidden');
    } catch (error) {
      alert('Microphone permission denied');
    }
  });

  document.addEventListener('click', (e) => {
    if (!elements.modeSelectBtn.contains(e.target) && !elements.modeDropdown.contains(e.target)) {
      elements.modeDropdown.classList.add('hidden');
      elements.modeSelectBtn.classList.remove('open');
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
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
        }
      }
    } catch (error) {
      clearInterval(checkInterval);
      const authStatus = await checkAuthStatus();
      if (authStatus.authenticated) {
        showRecordingSection(authStatus.user);
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
  const config = {
    mode: currentMode,
    micEnabled: micEnabled,
    cameraEnabled: cameraEnabled
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

init();
