import { updateGPIOControl } from './gpio.js';

fetch('/api/gpio')
   .then(res => res.json())
   .then(updateGPIOControl)
   .catch(console.error);

import {
   scanDevices,
   toggleBluetooth,
   loadPairedDevices,
   connectToDevice,
   updateBluetoothUI,
   getSelectedDeviceAddress,
} from './bluetooth.js';

import { initBatteryModule } from './battery.js';
import { fetchStatus } from './status.js';
import { fetchNetworkStats } from './network.js';
import { initGauges } from './gauges.js'; // ✅ Ajout ici !

document.addEventListener('DOMContentLoaded', () => {
   initGauges(); // ✅ Création des jauges après chargement DOM
   fetchStatus();
   fetchNetworkStats();
   initBatteryModule();
   loadPairedDevices();

   // Intervalle de rafraîchissement status
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

   // Barre de scan visuelle
   const scanContainer = document.getElementById('scan-progress-container');
   const bar = document.getElementById('scan-progress-bar');
   if (scanContainer && bar) {
      scanContainer.style.display = 'block';
      bar.style.width = '60%';
   }

   // Boutons
   document.getElementById('scan-btn')?.addEventListener('click', scanDevices);

   document.getElementById('connect-button')?.addEventListener('click', () => {
      const mac = getSelectedDeviceAddress();
      if (mac) connectToDevice(mac);
   });

   document.getElementById('reboot-button')?.addEventListener('click', () => {
      if (confirm('Êtes-vous sûr de vouloir redémarrer le Raspberry Pi ?')) {
         fetch('/api/reboot', { method: 'POST' }).then(() =>
            alert('Commande de redémarrage envoyée')
         );
      }
   });

   document.getElementById('shutdown-button')?.addEventListener('click', () => {
      if (confirm('Êtes-vous sûr de vouloir éteindre le Raspberry Pi ?')) {
         fetch('/api/shutdown', { method: 'POST' }).then(() =>
            alert("Commande d'arrêt envoyée")
         );
      }
   });
});

