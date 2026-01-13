console.log('permission.js loading...');

const API_BASE_URL = 'https://cap.so';
const startRecordingBtn = document.getElementById('start-recording-btn');
const closeBtn = document.getElementById('close-btn');
const userName = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const popupController = new PopupController();

async function checkAuthStatus() {
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

function displayUserInfo(user) {
  if (userName && userAvatar) {
    userName.textContent = user.name || user.email;
    userAvatar.textContent = (user.name || user.email).charAt(0).toUpperCase();
  }
}

function updateStartButton() {
  const cameraGranted = popupController.cameraPermissionState === 'granted';
  const micGranted = popupController.micPermissionState === 'granted';

  if (cameraGranted && micGranted) {
    startRecordingBtn.disabled = false;
    startRecordingBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
      Close & Start Recording
    `;
  }
}

const originalUpdateStatusPills = popupController.updateStatusPills.bind(popupController);
popupController.updateStatusPills = function () {
  originalUpdateStatusPills();
  updateStartButton();
};

startRecordingBtn.addEventListener('click', () => {
  window.close();
});

closeBtn.addEventListener('click', () => {
  window.close();
});

async function init() {
  const authStatus = await checkAuthStatus();

  if (authStatus.authenticated) {
    displayUserInfo(authStatus.user);
  }

  await popupController.init();
}

init();
