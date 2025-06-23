import { updateGPIOControl } from './gpio.js';
import {
  scanDevices,
  toggleBluetooth,
  loadPairedDevices,
  connectToDevice,
  updateBluetoothUI,
  getSelectedDeviceAddress
} from './bluetooth.js';
import { initBatteryModule } from './battery.js';
import { fetchStatus } from './status.js';
import { fetchNetworkStats } from './network.js';
import { initGauges } from './gauges.js';
import { setupSystemActionListeners } from './system.js';
import { waitForNeoBerryToRestart } from './watchdog.js';
import { loadSystemInfo } from './infosys.js';
import { updateVoltage } from './voltage.js';


let pendingAction = { value: null };

function openConfirmModal(action) {
  document.getElementById('confirm-container').style.display = 'block';
}

function closeConfirmModal() {
  document.getElementById('confirm-container').style.display = 'none';
}

function openAuthModal() {
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('progress-bar')?.classList.add('hidden');
  document.getElementById('auth-submit').disabled = false;

  const title = document.getElementById('auth-title');
  switch (pendingAction.value) {
    case 'reboot':
      title.textContent = 'Confirmation : redémarrage du système';
      break;
    case 'shutdown':
      title.textContent = 'Confirmation : arrêt du système';
      break;
    case 'restart-neoberry':
      title.textContent = 'Confirmation : relancer NeoBerry';
      break;
    default:
      title.textContent = 'Confirmation système';
  }

  document.getElementById('auth-container').style.display = 'block';
}

function closeAuthModal() {
  document.getElementById('auth-container').style.display = 'none';
  pendingAction.value = null;
}

document.addEventListener('DOMContentLoaded', () => {
  initGauges();
  fetchStatus();
  fetchNetworkStats();
  initBatteryModule();
  loadPairedDevices();
  
  updateVoltage();
  setInterval(updateVoltage, 15000);
    
  loadSystemInfo();
  setInterval(loadSystemInfo, 600000);

  fetch('/api/gpio')
    .then(res => res.json())
    .then(updateGPIOControl)
    .catch(console.error);

  let refreshInterval = 3000;
  let refreshTimer = setInterval(fetchStatus, refreshInterval);

  const intervalSelector = document.getElementById('refresh-interval');
  if (intervalSelector) {
    intervalSelector.addEventListener('change', () => {
      refreshInterval = Number(intervalSelector.value);
      clearInterval(refreshTimer);
      refreshTimer = setInterval(fetchStatus, refreshInterval);
    });
  }

  const scanContainer = document.getElementById('scan-progress-container');
  const bar = document.getElementById('scan-progress-bar');
  if (scanContainer && bar) {
    scanContainer.style.display = 'block';
    bar.style.width = '60%';
  }

  document.getElementById('scan-btn')?.addEventListener('click', scanDevices);

  document.getElementById('connect-button')?.addEventListener('click', () => {
    const mac = getSelectedDeviceAddress();
    if (mac) connectToDevice(mac);
  });

  setupSystemActionListeners(pendingAction, openConfirmModal, openAuthModal, closeConfirmModal, closeAuthModal);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAuthModal();
    closeConfirmModal();
  }
});

document.getElementById('auth-password')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('auth-submit')?.click();
  }
});

document.getElementById('confirm-container')?.addEventListener('click', (e) => {
  if (e.target.id === 'confirm-container') closeConfirmModal();
});

document.getElementById('auth-container')?.addEventListener('click', (e) => {
  if (e.target.id === 'auth-container') closeAuthModal();
});

document.getElementById('toggle-password')?.addEventListener('click', () => {
  const input = document.getElementById('auth-password');
  input.type = input.type === 'password' ? 'text' : 'password';
});





