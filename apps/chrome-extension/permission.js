console.log('permission.js loading...');

const startRecordingBtn = document.getElementById('start-recording-btn');
const closeBtn = document.getElementById('close-btn');
const popupController = new PopupController();

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

popupController.init();
