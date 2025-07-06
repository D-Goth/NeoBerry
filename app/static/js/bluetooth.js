let selectedDevice = null;
let scannedDevices = [];
let selectedDeviceIndex = null;

export function updateBluetoothUI(data) {
   const bluetoothToggleBtn = document.getElementById('bluetooth-toggle');
   const bluetoothDeviceInfo = document.getElementById('bluetooth-device');
   bluetoothToggleBtn.classList.toggle('on', data.bluetooth.enabled);
   bluetoothToggleBtn.textContent = data.bluetooth.enabled ? 'ON' : 'OFF';
   bluetoothToggleBtn.setAttribute('aria-pressed', data.bluetooth.enabled);
   bluetoothDeviceInfo.textContent = `Périphérique connecté : ${data.bluetooth.device || 'Aucun'}`;
}

export function scanDevices() {
   const list = document.getElementById('paired-devices-list');
   if (!list) return;

   list.innerHTML = '';

   const scanning = document.createElement('li');
   scanning.textContent = '[ SCANNING... ]';
   scanning.classList.add('scanning-line');
   list.appendChild(scanning);

   fetch('/bluetooth/scan')
      .then((res) => res.json())
      .then((data) => {
         scannedDevices = data;
         list.innerHTML = '';

         if (scannedDevices.length === 0) {
            const none = document.createElement('li');
            none.textContent = '[ Aucun périphérique trouvé ]';
            none.classList.add('scanning-line');
            list.appendChild(none);
            return;
         }

         scannedDevices.forEach((device, index) => {
            const li = document.createElement('li');
            li.textContent = `${device.name} (${device.address})`;
            li.classList.add('device-line');

            li.addEventListener('click', () => {
               selectedDeviceIndex = index;
               updateSelectedDeviceUI(list);
            });

            list.appendChild(li);
         });
      });
}

export function updateSelectedDeviceUI(list) {
   const items = list.querySelectorAll('.device-line');
   items.forEach((item, i) => {
      if (i === selectedDeviceIndex) item.classList.add('selected');
      else item.classList.remove('selected');
   });
}

export function getSelectedDeviceAddress() {
   if (selectedDeviceIndex !== null && scannedDevices[selectedDeviceIndex]) {
      return scannedDevices[selectedDeviceIndex].address;
   }
   return null;
}

export function loadPairedDevices() {
   fetch('/api/bluetooth/paired')
      .then((res) => res.json())
      .then((devices) => {
         const list = document.getElementById('paired-devices-list');
         if (!list) return;

         list.innerHTML = '';

         devices.forEach((dev) => {
            const li = document.createElement('li');
            li.textContent = dev.name || dev.mac;

            if (dev.connected) li.classList.add('connected');

            const forgetBtn = document.createElement('button');
            forgetBtn.textContent = 'Oublier';
            forgetBtn.onclick = () => forgetDevice(dev.mac);
            li.appendChild(forgetBtn);
            list.appendChild(li);
         });

         renderPairedDevices(devices);
      });
}

export function forgetDevice(mac) {
   fetch('/api/bluetooth/forget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac }),
   }).then(loadPairedDevices);
}

export function renderPairedDevices(devices) {
   const list = document.getElementById('paired-devices-list');
   if (!list) return;

   list.innerHTML = '';
   const minLines = 5;
   const total = devices.length;

   for (let i = 0; i < Math.max(minLines, total); i++) {
      const li = document.createElement('li');

      if (i < total) {
         const dev = devices[i];
         li.textContent = dev.name || dev.mac;
         if (dev.connected) li.classList.add('connected');

         li.addEventListener('click', () => {
            document
               .querySelectorAll('#paired-devices-list li')
               .forEach((el) => el.classList.remove('selected'));

            li.classList.add('selected');
            selectedDevice = dev;

            const btn = document.getElementById('connect-button');
            if (btn) btn.disabled = false;
         });
      } else {
         li.innerHTML = '&nbsp;';
      }

      list.appendChild(li);
   }

   appendTerminalCursor();
}

export function appendTerminalCursor() {
   const oldCursor = document.querySelector('.terminal-cursor');
   if (oldCursor) oldCursor.remove();

   const cursor = document.createElement('div');
   cursor.className = 'terminal-cursor';
   cursor.textContent = '▮';
   document.querySelector('.paired-devices').appendChild(cursor);
}

export function toggleBluetooth(state) {
   fetch(`/bluetooth/${state ? 'on' : 'off'}`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => console.log('Bluetooth', data.status));
}

export function connectToDevice(mac) {
   const pin = document.getElementById('pin-input').value.trim();
   const list = document.getElementById('paired-devices-list');

   if (!pin) {
      alert('Merci de renseigner le code PIN.');
      return;
   }

   list.innerHTML = '';
   const msg = document.createElement('li');
   msg.textContent = `[ CONNECTING TO ${mac}... ]`;
   msg.classList.add('scanning-line');
   list.appendChild(msg);

   fetch('/api/bluetooth/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac, pin }),
   })
      .then((res) => res.json())
      .then((result) => {
         msg.remove();
         const statusLi = document.createElement('li');

         if (result.status === 'connected') {
            statusLi.textContent = '[ CONNECTED ✔ ]';
            statusLi.style.color = '#00ff99';
         } else {
            statusLi.textContent = '[ FAILED ✖ ]';
            statusLi.style.color = 'orangered';
         }

         list.appendChild(statusLi);
         appendTerminalCursor();
      })
      .catch((err) => {
         msg.remove();
         const errLi = document.createElement('li');
         errLi.textContent = `[ ERREUR : ${err.message} ]`;
         errLi.style.color = 'red';
         list.appendChild(errLi);
         appendTerminalCursor();
      });
}

export function showScanningLine() {
   const list = document.getElementById('paired-devices-list');
   if (!list) return;

   const scanning = document.createElement('li');
   scanning.textContent = '[ SCANNING... ]';
   scanning.classList.add('scanning-line');
   list.appendChild(scanning);
}

window.scanDevices = scanDevices;

window.addEventListener('DOMContentLoaded', () => {
   const toggle = document.getElementById('bluetooth-toggle');
   const terminalPanel = document.querySelector('.bluetooth-terminal-panel');

   // Charger l’état initial du Bluetooth
   fetch('/api/bluetooth/status')
      .then((res) => res.json())
      .then((data) => {
         toggle.checked = !!data.device; // Si un périphérique est connecté → BT actif
         if (!toggle.checked && terminalPanel) terminalPanel.style.opacity = '0.25';
      });

   // Changement d’état
   toggle.addEventListener('change', () => {
      const isEnabled = toggle.checked;
      toggleBluetooth(isEnabled);
      if (terminalPanel) {
         terminalPanel.style.opacity = isEnabled ? '1' : '0.25';
         terminalPanel.style.pointerEvents = isEnabled ? 'auto' : 'none';
      }
   });
});
