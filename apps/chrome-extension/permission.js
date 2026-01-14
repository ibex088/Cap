console.log('permission.js loading...');

const popupController = new PopupController();

async function init() {
  await popupController.init();
}

init();
