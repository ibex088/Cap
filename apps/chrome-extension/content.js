let recordingIndicator = null;
let recordingTimer = null;
let startTime = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'RECORDING_STARTED':
      showRecordingIndicator();
      break;
    
    case 'RECORDING_STOPPED':
      hideRecordingIndicator();
      break;
    
    case 'UPLOAD_PROGRESS':
      updateIndicatorProgress(message.progress, message.status);
      break;
  }
});

function showRecordingIndicator() {
  if (recordingIndicator) return;

  recordingIndicator = document.createElement('div');
  recordingIndicator.id = 'cap-recording-indicator';
  recordingIndicator.innerHTML = `
    <style>
      #cap-recording-indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 24px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }
      
      #cap-recording-indicator:hover {
        transform: scale(1.05);
      }
      
      .cap-rec-dot {
        width: 10px;
        height: 10px;
        background: #ef4444;
        border-radius: 50%;
        animation: cap-pulse 1.5s ease-in-out infinite;
      }
      
      @keyframes cap-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .cap-rec-time {
        font-variant-numeric: tabular-nums;
        min-width: 45px;
      }
      
      .cap-rec-stop {
        margin-left: 8px;
        padding: 4px 12px;
        background: #ef4444;
        border: none;
        border-radius: 12px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .cap-rec-stop:hover {
        background: #dc2626;
      }
    </style>
    <div class="cap-rec-dot"></div>
    <span class="cap-rec-time">00:00</span>
    <button class="cap-rec-stop">Stop</button>
  `;

  document.body.appendChild(recordingIndicator);

  const stopBtn = recordingIndicator.querySelector('.cap-rec-stop');
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  });

  startTime = Date.now();
  startTimer();
}

function hideRecordingIndicator() {
  stopTimer();
  
  if (recordingIndicator) {
    recordingIndicator.remove();
    recordingIndicator = null;
  }
}

function startTimer() {
  recordingTimer = setInterval(() => {
    if (!recordingIndicator) return;
    
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const timeElement = recordingIndicator.querySelector('.cap-rec-time');
    if (timeElement) {
      timeElement.textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }, 1000);
}

function stopTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
}

function updateIndicatorProgress(progress, status) {
  if (!recordingIndicator) return;
  
  const timeElement = recordingIndicator.querySelector('.cap-rec-time');
  if (timeElement) {
    timeElement.textContent = `${Math.round(progress)}%`;
  }
}
