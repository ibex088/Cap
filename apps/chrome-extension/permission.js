console.log('permission.js loading...');

const API_BASE_URL = 'https://cap.so';
const loadingSection = document.getElementById('loading-section');
const authSection = document.getElementById('auth-section');
const recordingSection = document.getElementById('recording-section');
const startRecordingBtn = document.getElementById('start-recording-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const closeBtn = document.getElementById('cap-close-permission');
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

function showAuthSection() {
  loadingSection.classList.add('hidden');
  authSection.classList.remove('hidden');
  recordingSection.classList.add('hidden');
}

function showRecordingSection(user) {
  loadingSection.classList.add('hidden');
  authSection.classList.add('hidden');
  recordingSection.classList.remove('hidden');

  if (user) {
    displayUserInfo(user);
  }
}

function displayUserInfo(user) {
  if (userName && userAvatar) {
    userName.textContent = user.name || user.email;
    userAvatar.textContent = (user.name || user.email).charAt(0).toUpperCase();
  }
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

startRecordingBtn.addEventListener('click', () => {
  window.close();
});

signOutBtn.addEventListener('click', handleSignOut);

closeBtn.addEventListener('click', () => {
  window.close();
});

async function init() {
  const authStatus = await checkAuthStatus();

  if (authStatus.authenticated) {
    showRecordingSection(authStatus.user);
  } else {
    showAuthSection();
  }

  await popupController.init();
}

init();
