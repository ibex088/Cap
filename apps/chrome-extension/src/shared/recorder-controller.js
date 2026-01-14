const NO_CAMERA_VALUE = 'no-camera';
const NO_MIC_VALUE = 'no-microphone';
const API_BASE_URL = 'https://cap.so';
const LOGIN_URL = 'https://cap.so/login';
class RecorderController {
  constructor() {
    this.currentMode = 'screen';
    this.selectedCameraId = null;
    this.selectedMicId = null;
    this.availableCameras = [];
    this.availableMics = [];
    this.cameraPermissionState = 'prompt';
    this.micPermissionState = 'prompt';
    this.cameraPreview = null;
    
    this.elements = {
      cameraStatus: document.getElementById('camera-status'),
      micStatus: document.getElementById('mic-status'),
      cameraSelectBtn: document.getElementById('camera-select-btn'),
      micSelectBtn: document.getElementById('mic-select-btn'),
      cameraLabel: document.getElementById('camera-label'),
      micLabel: document.getElementById('mic-label'),
      cameraDropdown: document.getElementById('camera-dropdown'),
      micDropdown: document.getElementById('mic-dropdown'),
      modeSelectBtn: document.getElementById('mode-select-btn'),
      modeLabel: document.getElementById('mode-label'),
      modeDropdown: document.getElementById('mode-dropdown')
    };
  }

  async checkMediaPermission(kind) {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return 'unsupported';
    }

    try {
      const permission = await navigator.permissions.query({ name: kind });
      return permission.state;
    } catch (error) {
      console.log(`Permission API not supported for ${kind}:`, error);
      return 'unsupported';
    }
  }

  async requestMediaPermission(kind) {
    const statusElement = kind === 'camera' ? this.elements.cameraStatus : this.elements.micStatus;
    
    statusElement.textContent = 'Requesting...';
    statusElement.classList.add('request-permission');

    try {
      const constraints = kind === 'camera'
        ? { video: true, audio: false }
        : { audio: true, video: false };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach(track => track.stop());

      if (kind === 'camera') {
        this.cameraPermissionState = 'granted';
      } else {
        this.micPermissionState = 'granted';
      }

      await chrome.storage.local.set({ 
        [`${kind}Permission`]: 'granted' 
      });

      await this.enumerateDevices();
      this.updatePermissionUI();
      return true;
    } catch (error) {
      console.error(`${kind} permission request failed:`, error);
      
      if (kind === 'camera') {
        this.cameraPermissionState = 'denied';
      } else {
        this.micPermissionState = 'denied';
      }

      await chrome.storage.local.set({ 
        [`${kind}Permission`]: 'denied' 
      });

      this.updatePermissionUI();
      return false;
    }
  }

  async enumerateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter(d => d.kind === 'videoinput' && d.deviceId);
      this.availableMics = devices.filter(d => d.kind === 'audioinput' && d.deviceId);

      this.updateDeviceSelectors();
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
    }
  }

  updateDeviceSelectors() {
    if (this.elements.cameraDropdown) {
      this.elements.cameraDropdown.innerHTML = `
        <button class="device-option active" data-camera="${NO_CAMERA_VALUE}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 1l22 22M7 7a7 7 0 0 0 10 10M12 5a7 7 0 0 1 7 7v.5"></path>
          </svg>
          <span>No Camera</span>
        </button>
      `;

      this.availableCameras.forEach((camera, index) => {
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
        this.elements.cameraDropdown.appendChild(option);
      });

      this.updateCameraLabel();
    }

    if (this.elements.micDropdown) {
      this.elements.micDropdown.innerHTML = `
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

      this.availableMics.forEach((mic, index) => {
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
        this.elements.micDropdown.appendChild(option);
      });

      this.updateMicLabel();
    }
  }

  updateCameraLabel() {
    if (!this.elements.cameraLabel) return;

    if (!this.selectedCameraId || this.selectedCameraId === NO_CAMERA_VALUE) {
      this.elements.cameraLabel.textContent = 'No Camera';
    } else {
      const camera = this.availableCameras.find(c => c.deviceId === this.selectedCameraId);
      const index = this.availableCameras.indexOf(camera);
      this.elements.cameraLabel.textContent = camera?.label || `Camera ${index + 1}`;
    }

    document.querySelectorAll('[data-camera]').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-camera') === (this.selectedCameraId || NO_CAMERA_VALUE)) {
        btn.classList.add('active');
      }
    });
  }

  updateMicLabel() {
    if (!this.elements.micLabel) return;

    if (!this.selectedMicId || this.selectedMicId === NO_MIC_VALUE) {
      this.elements.micLabel.textContent = 'No Microphone';
    } else {
      const mic = this.availableMics.find(m => m.deviceId === this.selectedMicId);
      const index = this.availableMics.indexOf(mic);
      this.elements.micLabel.textContent = mic?.label || `Microphone ${index + 1}`;
    }

    document.querySelectorAll('[data-mic]').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-mic') === (this.selectedMicId || NO_MIC_VALUE)) {
        btn.classList.add('active');
      }
    });
  }

  updatePermissionUI() {
    const shouldRequestCamera = this.cameraPermissionState !== 'granted' && this.cameraPermissionState !== 'unsupported';
    const shouldRequestMic = this.micPermissionState !== 'granted' && this.micPermissionState !== 'unsupported';

    if (this.elements.cameraSelectBtn) {
      this.elements.cameraSelectBtn.disabled = shouldRequestCamera;
    }

    if (this.elements.micSelectBtn) {
      this.elements.micSelectBtn.disabled = shouldRequestMic;
    }

    this.updateStatusPills();
  }

  updateStatusPills() {
    const shouldRequestCamera = this.cameraPermissionState !== 'granted' && this.cameraPermissionState !== 'unsupported';
    const shouldRequestMic = this.micPermissionState !== 'granted' && this.micPermissionState !== 'unsupported';

    const cameraEnabled = this.selectedCameraId !== null && this.selectedCameraId !== NO_CAMERA_VALUE;
    const micEnabled = this.selectedMicId !== null && this.selectedMicId !== NO_MIC_VALUE;

    if (shouldRequestCamera) {
      this.elements.cameraStatus.textContent = 'Request permission';
      this.elements.cameraStatus.classList.remove('on');
      this.elements.cameraStatus.classList.add('request-permission');
      this.elements.cameraStatus.disabled = false;
    } else if (cameraEnabled) {
      this.elements.cameraStatus.textContent = 'On';
      this.elements.cameraStatus.classList.add('on');
      this.elements.cameraStatus.classList.remove('request-permission');
      this.elements.cameraStatus.disabled = false;
    } else {
      this.elements.cameraStatus.textContent = 'Off';
      this.elements.cameraStatus.classList.remove('on', 'request-permission');
      this.elements.cameraStatus.disabled = true;
    }

    if (shouldRequestMic) {
      this.elements.micStatus.textContent = 'Request permission';
      this.elements.micStatus.classList.remove('on');
      this.elements.micStatus.classList.add('request-permission');
      this.elements.micStatus.disabled = false;
    } else if (micEnabled) {
      this.elements.micStatus.textContent = 'On';
      this.elements.micStatus.classList.add('on');
      this.elements.micStatus.classList.remove('request-permission');
      this.elements.micStatus.disabled = false;
    } else {
      this.elements.micStatus.textContent = 'Off';
      this.elements.micStatus.classList.remove('on', 'request-permission');
      this.elements.micStatus.disabled = true;
    }
  }

  setupDropdownListeners() {
    if (this.elements.modeSelectBtn) {
      this.elements.modeSelectBtn.addEventListener('click', () => {
        this.elements.modeDropdown.classList.toggle('hidden');
        this.elements.modeSelectBtn.classList.toggle('open');
      });
    }

    document.querySelectorAll('.mode-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMode = btn.dataset.mode;
        this.elements.modeLabel.textContent = btn.querySelector('span').textContent;
        this.elements.modeDropdown.classList.add('hidden');
        this.elements.modeSelectBtn.classList.remove('open');
        
        const icon = btn.querySelector('svg').cloneNode(true);
        this.elements.modeSelectBtn.querySelector('.mode-icon').replaceWith(icon);
        icon.classList.add('mode-icon');
      });
    });

    if (this.elements.cameraSelectBtn) {
      this.elements.cameraSelectBtn.addEventListener('click', () => {
        this.elements.cameraDropdown.classList.toggle('hidden');
        this.elements.cameraSelectBtn.classList.toggle('open');
        this.elements.micDropdown.classList.add('hidden');
        this.elements.micSelectBtn.classList.remove('open');
      });
    }

    if (this.elements.micSelectBtn) {
      this.elements.micSelectBtn.addEventListener('click', () => {
        this.elements.micDropdown.classList.toggle('hidden');
        this.elements.micSelectBtn.classList.toggle('open');
        this.elements.cameraDropdown.classList.add('hidden');
        this.elements.cameraSelectBtn.classList.remove('open');
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-camera]')) {
        const cameraId = e.target.closest('[data-camera]').getAttribute('data-camera');
        this.selectedCameraId = cameraId === NO_CAMERA_VALUE ? null : cameraId;
        this.updateCameraLabel();
        this.updateStatusPills();
        this.elements.cameraDropdown.classList.add('hidden');
        this.elements.cameraSelectBtn.classList.remove('open');
        this.handleCameraPreview();
      }

      if (e.target.closest('[data-mic]')) {
        const micId = e.target.closest('[data-mic]').getAttribute('data-mic');
        this.selectedMicId = micId === NO_MIC_VALUE ? null : micId;
        this.updateMicLabel();
        this.updateStatusPills();
        this.elements.micDropdown.classList.add('hidden');
        this.elements.micSelectBtn.classList.remove('open');
      }

      if (this.elements.modeSelectBtn && !this.elements.modeSelectBtn.contains(e.target) && !this.elements.modeDropdown.contains(e.target)) {
        this.elements.modeDropdown.classList.add('hidden');
        this.elements.modeSelectBtn.classList.remove('open');
      }

      if (!e.target.closest('.device-selector')) {
        this.elements.cameraDropdown.classList.add('hidden');
        this.elements.cameraSelectBtn.classList.remove('open');
        this.elements.micDropdown.classList.add('hidden');
        this.elements.micSelectBtn.classList.remove('open');
      }
    });
  }

  setupPermissionListeners() {
    this.elements.cameraStatus.addEventListener('click', async (e) => {
      e.stopPropagation();

      const shouldRequestCamera = this.cameraPermissionState !== 'granted' && this.cameraPermissionState !== 'unsupported';

      if (shouldRequestCamera) {
        await this.requestMediaPermission('camera');
        return;
      }

      const cameraEnabled = this.selectedCameraId !== null && this.selectedCameraId !== NO_CAMERA_VALUE;
      if (cameraEnabled) {
        this.selectedCameraId = null;
        this.updateCameraLabel();
        this.updateStatusPills();
      }
    });

    this.elements.micStatus.addEventListener('click', async (e) => {
      e.stopPropagation();

      const shouldRequestMic = this.micPermissionState !== 'granted' && this.micPermissionState !== 'unsupported';

      if (shouldRequestMic) {
        await this.requestMediaPermission('microphone');
        return;
      }

      const micEnabled = this.selectedMicId !== null && this.selectedMicId !== NO_MIC_VALUE;
      if (micEnabled) {
        this.selectedMicId = null;
        this.updateMicLabel();
        this.updateStatusPills();
      }
    });
  }

  async checkAuthStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
        credentials: 'include'
      });

      if (response.ok) {
        const session = await response.json();
        if (session?.user) {
          return { authenticated: true, user: session.user };
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }

    return { authenticated: false };
  }

  showAuthSection() {
    const loadingSection = document.getElementById('loading-section');
    const authSection = document.getElementById('auth-section');
    const recordingSection = document.getElementById('recording-section');
    const footer = document.querySelector('.footer');

    loadingSection.classList.add('hidden');
    authSection.classList.remove('hidden');
    recordingSection.classList.add('hidden');

    if (footer) {
      footer.classList.add('hidden');
    }
  }

  showRecordingSection(user) {
    const loadingSection = document.getElementById('loading-section');
    const authSection = document.getElementById('auth-section');
    const recordingSection = document.getElementById('recording-section');
    const footer = document.querySelector('.footer');

    loadingSection.classList.add('hidden');
    authSection.classList.add('hidden');
    recordingSection.classList.remove('hidden');

    if (footer) {
      footer.classList.remove('hidden');
    }

    if (user) {
      this.displayUserInfo(user);
    }
  }

  displayUserInfo(user) {
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');

    if (userName && userAvatar) {
      userName.textContent = user.name || user.email;
      userAvatar.textContent = (user.name || user.email).charAt(0).toUpperCase();
    }
  }

  async handleSignIn() {
    const signInBtn = document.getElementById('sign-in-btn');
    if (!signInBtn) return;

    const btnText = signInBtn.querySelector('.btn-text');
    const btnLoader = signInBtn.querySelector('.btn-loader');

    if (btnText && btnLoader) {
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');
    }
    signInBtn.disabled = true;

    const tab = await chrome.tabs.create({ url: LOGIN_URL });

    const checkInterval = setInterval(async () => {
      try {
        const currentTab = await chrome.tabs.get(tab.id);
        if (!currentTab) {
          clearInterval(checkInterval);
          const authStatus = await this.checkAuthStatus();
          if (authStatus.authenticated) {
            this.showRecordingSection(authStatus.user);
          } else {
            if (btnText && btnLoader) {
              btnText.classList.remove('hidden');
              btnLoader.classList.add('hidden');
            }
            signInBtn.disabled = false;
          }
        }
      } catch (error) {
        clearInterval(checkInterval);
        const authStatus = await this.checkAuthStatus();
        if (authStatus.authenticated) {
          this.showRecordingSection(authStatus.user);
        } else {
          if (btnText && btnLoader) {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
          }
          signInBtn.disabled = false;
        }
      }
    }, 1000);
  }

  async handleSignOut() {
    try {
      await fetch(`${API_BASE_URL}/api/auth/signout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Sign out failed:', error);
    }

    await chrome.storage.local.remove(['user']);
    this.showAuthSection();

    const signInBtn = document.getElementById('sign-in-btn');
    if (signInBtn) {
      const btnText = signInBtn.querySelector('.btn-text');
      const btnLoader = signInBtn.querySelector('.btn-loader');

      if (btnText && btnLoader) {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
      }
      signInBtn.disabled = false;
    }
  }

  setupAuthListeners() {
    const signInBtn = document.getElementById('sign-in-btn');
    const startRecordingBtn = document.getElementById('start-recording-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const closeBtn = document.getElementById('cap-close-permission');

    if (signInBtn) {
      signInBtn.addEventListener('click', () => this.handleSignIn());
    }

    if (startRecordingBtn) {
      startRecordingBtn.addEventListener('click', () => {
        window.close();
      });
    }

    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => this.handleSignOut());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        window.close();
      });
    }
  }

  async handleCameraPreview() {
    if (!this.selectedCameraId) {
      if (this.cameraPreview) {
        this.cameraPreview.close();
        this.cameraPreview = null;
      }
      return;
    }

    if (typeof CameraPreview === 'undefined') {
      console.warn('CameraPreview class not loaded');
      return;
    }

    if (!this.cameraPreview) {
      this.cameraPreview = new CameraPreview({
        onClose: () => {
          this.selectedCameraId = null;
          this.updateCameraLabel();
          this.updateStatusPills();
          this.cameraPreview = null;
        }
      });
    }

    await this.cameraPreview.show(this.selectedCameraId);
  }

  async init() {
    const authStatus = await this.checkAuthStatus();

    if (authStatus.authenticated) {
      this.showRecordingSection(authStatus.user);
    } else {
      this.showAuthSection();
    }

    this.cameraPermissionState = await this.checkMediaPermission('camera');
    this.micPermissionState = await this.checkMediaPermission('microphone');

    await this.enumerateDevices();
    this.updatePermissionUI();
    this.setupDropdownListeners();
    this.setupPermissionListeners();
    this.setupAuthListeners();
  }
}
