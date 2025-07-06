import {
  scanDevices,
  toggleBluetooth,
  loadPairedDevices,
  connectToDevice,
  updateBluetoothUI,
  getSelectedDeviceAddress
} from './bluetooth.js';
import { initBatteryModule } from './battery.js';
import { initGauges } from './gauges.js';
import { updateGPIOControl } from './gpio.js';
import { loadSystemInfo } from './infosys.js';
import { fetchNetworkStats } from './network.js';
import { initNovaBar } from './novabar.js';
import { fetchStatus } from './status.js';
import { setupSystemActionListeners } from './system.js';
import { updateMiniClock } from './time.js';
import { updateVoltage } from './voltage.js';
import { waitForNeoBerryToRestart } from './watchdog.js';
import './graph.js';


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

function parseDateTime(str) {
  const [datePart, timePart] = str.split(" ");
  const [dd, mm, yyyy]    = datePart.split("/");
  const [hh, min]         = timePart.split(":");
  return new Date(+yyyy, mm - 1, +dd, +hh, +min);
}

async function displayLastUpdate() {
  try {
    const res  = await fetch("/api/infosys");
    if (!res.ok) throw new Error(res.statusText);
    const { last_update } = await res.json();

    const dotEl  = document.getElementById("last-update-dot");
    const txtEl  = document.getElementById("last-update");
    if (!dotEl || !txtEl) return;

    if (!last_update) {
      txtEl.textContent = "—";
      dotEl.className   = "dot";
      return;
    }

    txtEl.textContent = last_update;
    const dt       = parseDateTime(last_update);
    const diffDays = (new Date() - dt) / (1000 * 60 * 60 * 24);

    let color = "green";
    if (diffDays > 7)      color = "red";
    else if (diffDays > 3) color = "orange";

    dotEl.className = `dot ${color}`;
  } catch (err) {
    console.error("Erreur displayLastUpdate:", err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initGauges();
  fetchStatus();
  fetchNetworkStats();
  initBatteryModule();
  loadPairedDevices();
  initNovaBar();
  
  displayLastUpdate();
  setInterval(displayLastUpdate, 5 * 60 * 1000);
  
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

document.getElementById('update-button')?.addEventListener('click', () => {
  showUpdateSystemModal();
});

window.closeConfirmModal = closeConfirmModal;
window.closeAuthModal = closeAuthModal;
