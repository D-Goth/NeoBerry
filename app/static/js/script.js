  function getGaugeColor(value) {
    if (value < 10) return '#00aaff';
    if (value < 25) return '#30d5c8';
    if (value < 50) return '#39d353';
    if (value < 70) return '#fed33c';
    if (value < 90) return '#fe9a4a';
    return '#fe4a4a';
  }

  // Plugin standard pour les jauges avec %
Chart.register({
  id: 'defaultDoughnutLabel',
  afterDraw: function(chart) {
    const { ctx, data } = chart;
    const { width, height } = chart;
    if (!chart.options.plugins.customNetworkLabel) { // Appliqué uniquement si ce n'est pas une jauge réseau
      ctx.save();
      ctx.font = '700 22px Poppins';
      ctx.fillStyle = getGaugeColor(data.datasets[0].data[0]);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.datasets[0].data[0] + '%', width / 2, height / 2 - 8);
      ctx.font = '400 12px Poppins';
      ctx.fillStyle = '#ffffffcc';
      ctx.fillText(data.labels[0], width / 2, height / 2 + 14);
      ctx.restore();
    }
  }
});

  // Plugin personnalisé pour les jauges réseau (avec unités)
Chart.register({
  id: 'customNetworkLabel',
  afterDraw: function(chart) {
    const { ctx, data } = chart;
    const { width, height } = chart;
    if (chart.options.plugins.customNetworkLabel) { // Appliqué uniquement si spécifié
      ctx.save();
      ctx.font = '700 22px Poppins';
      ctx.fillStyle = getGaugeColor(data.datasets[0].data[0]);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const valueToDisplay = chart.valueToDisplay || data.datasets[0].data[0];
      ctx.fillText(valueToDisplay, width / 2, height / 2 - 8);
      ctx.font = '400 12px Poppins';
      ctx.fillStyle = '#ffffffcc';
      ctx.fillText(data.labels[0], width / 2, height / 2 + 14);
      ctx.restore();
    }
  }
});

function createGauge(ctx, label, initialValue = 0, isNetworkGauge = false) {
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [label, 'Libre'],
      datasets: [{
        label: label,
        data: [initialValue, 100 - initialValue],
        backgroundColor: [getGaugeColor(initialValue), 'rgba(44, 44, 44, 0.75)'],
        borderWidth: 0,
        cutout: '75%'
      }]
    },
    options: {
      responsive: true,
      aspectRatio: 1,
      animation: true,
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false },
        customNetworkLabel: isNetworkGauge // Indique si le plugin personnalisé doit être utilisé
      }
    },
    plugins: isNetworkGauge ? [{ id: 'customNetworkLabel' }] : [{ id: 'defaultDoughnutLabel' }]
  });
}

  const gpioContainer = document.getElementById('gpio-controls');
  let gpioPins = [];

  function updateGPIOControl(gpioStates) {
    if (gpioPins.length === 0) {
      for (let i = 1; i <= 40; i++) {
        const pin = document.createElement('div');
        pin.className = 'gpio-pin';
        pin.setAttribute('role', 'gridcell');
        pin.setAttribute('tabindex', '0');
        const led = document.createElement('div');
        led.className = 'led-indicator';
        pin.appendChild(led);
        const labelSwitch = document.createElement('label');
        labelSwitch.className = 'switch';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('aria-checked', 'false');
        checkbox.setAttribute('aria-label', `Interrupteur GPIO ${i}`);
        labelSwitch.appendChild(checkbox);
        const sliderSpan = document.createElement('span');
        sliderSpan.className = 'slider';
        labelSwitch.appendChild(sliderSpan);
        pin.appendChild(labelSwitch);
        const pinNumber = document.createElement('div');
        pinNumber.className = 'gpio-number';
        pinNumber.textContent = `GPIO ${i}`;
        pin.appendChild(pinNumber);

        checkbox.addEventListener('change', (e) => {
          const checked = e.target.checked;
          pin.classList.toggle('active', checked);
          led.classList.toggle('on', checked);
          checkbox.setAttribute('aria-checked', checked.toString());
          fetch('/api/gpio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: i, state: checked })
          }).catch(() => {});
        });

        gpioContainer.appendChild(pin);
        gpioPins.push({ element: pin, led, checkbox });
      }
    }

    gpioPins.forEach(({ checkbox, element, led }, index) => {
      const state = gpioStates[index + 1];
      if (state !== undefined) {
        checkbox.checked = state;
        checkbox.setAttribute('aria-checked', state.toString());
        element.classList.toggle('active', state);
        led.classList.toggle('on', state);
      }
    });
  }

    const cpuLoadGauge = createGauge(document.getElementById('cpu-load-gauge').getContext('2d'), 'Charge CPU', 0);
    const cpuTempGauge = createGauge(document.getElementById('cpu-temp-gauge').getContext('2d'), 'T° CPU', 0);
    const ramLoadGauge = createGauge(document.getElementById('ram-load-gauge').getContext('2d'), 'Charge RAM', 0);
    const boardTempGauge = createGauge(document.getElementById('board-temp-gauge').getContext('2d'), 'T° Carte', 0);
    const diskCapacityGauge = createGauge(document.getElementById('disk-capacity-gauge').getContext('2d'), 'Capacité Stockage', 0);
    const diskWriteGauge = createGauge(document.getElementById('disk-write-gauge').getContext('2d'), 'Écriture Disque', 0);
    const diskReadGauge = createGauge(document.getElementById('disk-read-gauge').getContext('2d'), 'Lecture Disque', 0);
    const bluetoothQualityGauge = createGauge(document.getElementById('bluetooth-quality-gauge').getContext('2d'), 'Qualité Bluetooth', 0);
    const wifiStrengthGauge = createGauge(document.getElementById('wifi-strength-gauge').getContext('2d'), 'Puissance WiFi', 0);
    const networkUpGauge = createGauge(document.getElementById('network-up').getContext('2d'), 'Upload', 0, true);
    const networkDownGauge = createGauge(document.getElementById('network-down').getContext('2d'), 'Download', 0, true);

  let refreshInterval = 3000;
  let refreshTimer;

  const intervalSelector = document.getElementById('refresh-interval');
  intervalSelector.addEventListener('change', () => {
    refreshInterval = Number(intervalSelector.value);
    clearInterval(refreshTimer);
    refreshTimer = setInterval(fetchStatus, refreshInterval);
  });

  async function fetchStatus() {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) throw new Error('Erreur réseau');
      const data = await response.json();
      
      updateGPIOControl(data.gpio_states);

      cpuLoadGauge.data.datasets[0].data[0] = data.cpu_load;
      cpuLoadGauge.data.datasets[0].data[1] = 100 - data.cpu_load;
      cpuLoadGauge.data.datasets[0].backgroundColor[0] = getGaugeColor(data.cpu_load);
      cpuLoadGauge.update();

      cpuTempGauge.data.datasets[0].data[0] = data.cpu_temp;
      cpuTempGauge.data.datasets[0].data[1] = 100 - data.cpu_temp;
      cpuTempGauge.data.datasets[0].backgroundColor[0] = getGaugeColor(data.cpu_temp);
      cpuTempGauge.update();

      ramLoadGauge.data.datasets[0].data[0] = data.ram_load;
      ramLoadGauge.data.datasets[0].data[1] = 100 - data.ram_load;
      ramLoadGauge.data.datasets[0].backgroundColor[0] = getGaugeColor(data.ram_load);
      ramLoadGauge.update();

      boardTempGauge.data.datasets[0].data[0] = data.board_temp;
      boardTempGauge.data.datasets[0].data[1] = 100 - data.board_temp;
      boardTempGauge.data.datasets[0].backgroundColor[0] = getGaugeColor(data.board_temp);
      boardTempGauge.update();

      diskCapacityGauge.data.datasets[0].data[0] = data.disk_capacity_percent;
      diskCapacityGauge.data.datasets[0].data[1] = 100 - data.disk_capacity_percent;
      diskCapacityGauge.data.datasets[0].backgroundColor[0] = getGaugeColor(data.disk_capacity_percent);
      diskCapacityGauge.update();

      diskWriteGauge.data.datasets[0].data[0] = data.disk_write_percent;
      diskWriteGauge.data.datasets[0].data[1] = 100 - data.disk_write_percent;
      diskWriteGauge.data.datasets[0].backgroundColor[0] = getGaugeColor(data.disk_write_percent);
      diskWriteGauge.update();

      diskReadGauge.data.datasets[0].data[0] = data.disk_read_percent;
      diskReadGauge.data.datasets[0].data[1] = 100 - data.disk_read_percent;
      diskReadGauge.data.datasets[0].backgroundColor[0] = getGaugeColor(data.disk_read_percent);
      diskReadGauge.update();

      bluetoothQualityGauge.data.datasets[0].data[0] = data.bluetooth.quality;
      bluetoothQualityGauge.data.datasets[0].data[1] = 100 - data.bluetooth.quality;
      bluetoothQualityGauge.data.datasets[0].backgroundColor[0] = getGaugeColor(data.bluetooth.quality);
      bluetoothQualityGauge.update();

      wifiStrengthGauge.data.datasets[0].data[0] = data.network.wifi_strength;
      wifiStrengthGauge.data.datasets[0].data[1] = 100 - data.network.wifi_strength;
      wifiStrengthGauge.data.datasets[0].backgroundColor[0] = getGaugeColor(data.network.wifi_strength);
      wifiStrengthGauge.update();

      const bluetoothToggleBtn = document.getElementById('bluetooth-toggle');
      const bluetoothDeviceInfo = document.getElementById('bluetooth-device');
      bluetoothToggleBtn.classList.toggle('on', data.bluetooth.enabled);
      bluetoothToggleBtn.textContent = data.bluetooth.enabled ? 'ON' : 'OFF';
      bluetoothToggleBtn.setAttribute('aria-pressed', data.bluetooth.enabled);
      bluetoothDeviceInfo.textContent = `Périphérique connecté : ${data.bluetooth.device || 'Aucun'}`;
      
      document.getElementById('network-type').textContent = data.network.type || 'Inconnu';
      const wifiSection = document.getElementById('wifi-section');
      const wifiSsid = document.getElementById('wifi-ssid');
      if (data.network.type && data.network.type.toLowerCase() === 'wifi') {
        wifiSection.style.display = 'block';
        wifiSsid.textContent = `Nom réseau WiFi : ${data.network.wifi_ssid || 'Inconnu'}`;
      } else {
        wifiSection.style.display = 'none';
      }
    } catch (err) {
      console.error('Erreur récupération status', err);
    }
  }

  fetchStatus();
  refreshTimer = setInterval(fetchStatus, refreshInterval);

  document.addEventListener("DOMContentLoaded", function () {
    fetchNetworkStats();
    setInterval(fetchNetworkStats, 3000);
  });

  function customMin(a, b) {
    return (a < b) ? a : b;
  }
  function customMax(a, b) {
    return (a > b) ? a : b;
  }

  function updateBandwidth(canvasId, speed, label) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  let gauge = Chart.getChart(ctx);
  if (!gauge) {
    gauge = createGauge(ctx, label, 0, canvasId === 'network-up' || canvasId === 'network-down');
  }
  let value = parseSpeed(speed) || 0; // Valeur en MB/s ou équivalent
  const maxSpeed = 100; // Ajuster selon ta connexion max
  let percentage = (value > maxSpeed) ? 100 : (value / maxSpeed) * 100; // Pourcentage pour la jauge
  percentage = (percentage < 0) ? 0 : percentage;

  // Convertir la valeur en unité appropriée
  let convertedValue = value; // Valeur de base en MB/s
  let unit = 'MB/s';
  if (convertedValue < 0.001) {
    convertedValue *= 1024 * 1024; // Convertir en B/s
    unit = 'B/s';
  } else if (convertedValue < 1) {
    convertedValue *= 1024; // Convertir en KB/s
    unit = 'KB/s';
  } else if (convertedValue >= 1024) {
    convertedValue /= 1024; // Convertir en GB/s
    unit = 'GB/s';
  }
  convertedValue = convertedValue.toFixed(2); // Limiter à 2 décimales

  // Mettre à jour la jauge avec le pourcentage
  gauge.data.datasets[0].data[0] = percentage;
  gauge.data.datasets[0].data[1] = 100 - percentage;
  gauge.data.datasets[0].backgroundColor[0] = getGaugeColor(percentage);
  gauge.data.labels = [label, 'Libre'];

  // Définir la valeur à afficher dans le plugin pour les jauges réseau
  if (canvasId === 'network-up' || canvasId === 'network-down') {
    gauge.valueToDisplay = convertedValue + ' ' + unit;
  }

  gauge.update();
}

  function fetchNetworkStats() {
    fetch('/api/network')
      .then(response => {
        if (!response.ok) throw new Error(`Erreur API : ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (!data.metrics) return;
        updateBandwidth("network-up", data.metrics.network_up, "Upload");
        updateBandwidth("network-down", data.metrics.network_down, "Download");
      })
      .catch(error => console.error("Erreur lors de la récupération des stats réseau :", error));
  }

  function parseSpeed(speedStr) {
    if (!speedStr || speedStr === 'N/A') return 0;
    const match = speedStr.match(/([\d\.]+)\s*(B\/s|KB\/s|MB\/s|GB\/s)/);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'GB/s': return value * 1024 * 1024;
      case 'MB/s': return value * 1024;
      case 'KB/s': return value;
      case 'B/s': return value / 1024;
      default: return 0;
    }
  }

  document.getElementById('reboot-button').addEventListener('click', () => {
    if (confirm('Êtes-vous sûr de vouloir redémarrer le Raspberry Pi ?')) {
      fetch('/api/reboot', { method: 'POST' }).then(() => alert('Commande de redémarrage envoyée'));
    }
  });

  document.getElementById('shutdown-button').addEventListener('click', () => {
    if (confirm('Êtes-vous sûr de vouloir éteindre le Raspberry Pi ?')) {
      fetch('/api/shutdown', { method: 'POST' }).then(() => alert("Commande d'arrêt envoyée"));
    }
  });
  
  // Mise à jour de la jauge
function updateBatteryGauge(data) {
  const percent = data.percent;
  const fill = document.getElementById('battery-fill');
  const percentDisplay = document.getElementById('battery-percent');
  let color = '#39d353'; // Vert (75-100%)
  if (percent < 25) color = '#ff0000'; // Rouge (<25%)
  else if (percent < 50) color = '#ff8000'; // Orange (25-49%)
  else if (percent < 75) color = '#ffff00'; // Jaune (50-74%)
  fill.style.width = `${percent}%`;
  fill.style.background = color;
  percentDisplay.textContent = `${percent}%`;
  
  if (data.no_battery_detected) {
    gauge.title = "Aucune batterie détectée. Connectez une batterie USB compatible avec un contrôleur (ex. via upower) pour une détection automatique.";
  } else {
    gauge.title = "";
  }

  // Indiquer la recharge
  if (data.power_plugged && percent < 100) {
    fill.classList.add('charging');
  } else {
    fill.classList.remove('charging');
  }
}

// Initialisation du graphique
let batteryChart = new Chart(document.getElementById('battery-chart'), {
  type: 'line',
  data: {
    labels: Array.from({length: 60}, (_, i) => i),
    datasets: [{
      label: 'Charge (%)',
      data: [],
      borderColor: '#db0038',
      fill: false
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, max: 100 } }
  }
});

// Mise à jour en temps réel
function updateBattery() {
  fetch('/api/battery')
    .then(response => response.json())
    .then(data => {
      updateBatteryGauge(data);
      const status = document.getElementById('battery-status');
      if (data.power_plugged) {
        status.textContent = "Branché directement";
      } else if (data.secsleft) {
        const minutes = Math.floor(data.secsleft / 60);
        status.textContent = `Temps restant : ${minutes} min`;
      } else {
        status.textContent = "Temps restant inconnu";
      }
    });

  fetch('/api/battery_history')
    .then(response => response.json())
    .then(data => {
      batteryChart.data.datasets[0].data = data.map(d => d.percent);
      batteryChart.update();
    });
}

setInterval(updateBattery, 5000); // Mise à jour toutes les 5 secondes
updateBattery(); // Chargement initial
