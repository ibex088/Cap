const urlParams = new URLSearchParams(window.location.search);
const permissionType = urlParams.get('type');

const title = document.getElementById('title');
const description = document.getElementById('description');
const status = document.getElementById('status');

if (permissionType === 'camera') {
  title.textContent = 'Camera Permission Required';
  description.textContent = 'Cap needs access to your camera. Please click "Allow" when prompted by your browser.';
} else if (permissionType === 'microphone') {
  title.textContent = 'Microphone Permission Required';
  description.textContent = 'Cap needs access to your microphone. Please click "Allow" when prompted by your browser.';
}

async function requestPermission() {
  try {
    const constraints = permissionType === 'camera'
      ? { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }
      : { audio: true, video: false };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    stream.getTracks().forEach(track => track.stop());

    status.className = 'status success';
    status.innerHTML = '<div class="icon">✓</div><div>Permission granted! This tab will close automatically.</div>';

    await chrome.runtime.sendMessage({
      type: 'PERMISSION_RESULT',
      granted: true
    });

    // setTimeout(() => {
    //   window.close();
    // }, 1500);
  } catch (error) {
    console.error('Permission request failed:', error);
    
    status.className = 'status error';
    
    if (error.name === 'NotAllowedError') {
      status.innerHTML = '<div class="icon">✗</div><div>Permission denied. Please try again and click "Allow".</div>';
    } else {
      status.innerHTML = `<div class="icon">✗</div><div>Error: ${error.message}</div>`;
    }

    await chrome.runtime.sendMessage({
      type: 'PERMISSION_RESULT',
      granted: false
    });

    // setTimeout(() => {
    //   window.close();
    // }, 3000);
  }
}

requestPermission();
