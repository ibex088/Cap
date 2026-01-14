console.log('recorder-init.js loading...');

const recorderController = new RecorderController();

async function init() {
  await recorderController.init();
}

init();
