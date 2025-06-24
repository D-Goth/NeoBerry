import {
  cpuLoadGauge,
  cpuTempGauge,
  ramLoadGauge,
  boardTempGauge,
  diskCapacityGauge,
  diskWriteGauge,
  diskReadGauge,
  bluetoothQualityGauge,
  wifiStrengthGauge,
  getGaugeColor,
} from './gauges.js';

import { updateGPIOControl } from './gpio.js';
import { updateBluetoothUI } from './bluetooth.js';

/**
 * Récupère et met à jour l'ensemble des jauges système.
 */
export async function fetchStatus() {
   try {
      const response = await fetch('/api/status');
      if (!response.ok) throw new Error('Erreur réseau');
      const data = await response.json();

      updateGPIOControl(data.gpio_states);
      updateBluetoothUI(data);

      // CPU Load
      updateGauge(cpuLoadGauge, data.cpu_load);
      updateGauge(cpuTempGauge, data.cpu_temp);
      updateGauge(ramLoadGauge, data.ram_load);
      updateGauge(boardTempGauge, data.board_temp);

      // Disque
      updateGauge(diskCapacityGauge, data.disk_capacity_percent);
      updateGauge(diskWriteGauge, data.disk_write_percent);
      updateGauge(diskReadGauge, data.disk_read_percent);

      // Bluetooth
      if (data.bluetooth) {
         updateGauge(bluetoothQualityGauge, data.bluetooth.quality);
      }

      // WiFi
      if (data.network) {
         updateGauge(wifiStrengthGauge, data.network.wifi_strength);

         const info = document.getElementById('network-info');
         if (info) info.textContent = data.network.type || 'Inconnu';

         const wifiSection = document.getElementById('wifi-section');
         const wifiSsid = document.getElementById('wifi-ssid');

         if (data.network.type?.toLowerCase() === 'wifi') {
            if (wifiSection) wifiSection.style.display = 'block';
            if (wifiSsid) wifiSsid.textContent = `Nom réseau WiFi : ${data.network.wifi_ssid || 'Inconnu'}`;
         } else {
            if (wifiSection) wifiSection.style.display = 'none';
         }
      }

   } catch (err) {
      console.error('Erreur récupération status', err);
   }
}

/**
 * Met à jour une jauge avec une nouvelle valeur.
 */
function updateGauge(gauge, value) {
   if (!gauge || typeof value !== 'number') return;

   gauge.data.datasets[0].data[0] = value;
   gauge.data.datasets[0].data[1] = 100 - value;
   gauge.data.datasets[0].backgroundColor[0] = getGaugeColor(value);
   gauge.update();
}

