document.addEventListener("DOMContentLoaded", function () {
    fetchStatus();
    setInterval(fetchStatus, 3000);

    fetchNetworkStats();
    setInterval(fetchNetworkStats, 3000);

    updateBattery();
    setInterval(updateBattery, 3000);

    loadPairedDevices();


    const networkUpGauge = createGauge(document.getElementById('network-up').getContext('2d'), 'Upload', 0, true);
    const networkDownGauge = createGauge(document.getElementById('network-down').getContext('2d'), 'Download', 0, true);

    let refreshInterval = 3000;
    let refreshTimer;

    document.getElementById('scan-progress-container').style.display = 'block';

    let bar = document.getElementById('scan-progress-bar');
    bar.style.width = '60%'; // ou animation, ou mise à jour live


    const intervalSelector = document.getElementById('refresh-interval');
    if (intervalSelector) {
        intervalSelector.addEventListener('change', () => {
            refreshInterval = Number(intervalSelector.value);
            clearInterval(refreshTimer);
            refreshTimer = setInterval(fetchStatus, refreshInterval);
        });
    }

    refreshTimer = setInterval(fetchStatus, refreshInterval);
});

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

    // Vérifie si le plugin est spécifié dans les options
    if (chart.options.plugins.customNetworkLabel) {
      ctx.save();

      // Configuration de la police pour la valeur affichée
      ctx.font = '700 22px Poppins';
      ctx.fillStyle = getGaugeColor(data.datasets[0].data[0]); // Couleur basée sur le pourcentage
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Valeur à afficher, avec unité si disponible
      const valueToDisplay = chart.valueToDisplay || data.datasets[0].data[0];
      ctx.fillText(valueToDisplay, width / 2, height / 2 - 8); // Affiche la valeur au centre

      // Configuration de la police pour le label
      ctx.font = '400 12px Poppins';
      ctx.fillStyle = '#ffffffcc'; // Couleur du texte pour le label
      ctx.fillText(data.labels[0], width / 2, height / 2 + 14); // Affiche le label sous la valeur

      ctx.restore(); // Restaure le contexte
    }
  }
});


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

  async function fetchStatus() {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) throw new Error('Erreur réseau');
      const data = await response.json();
      
      updateGPIOControl(data.gpio_states);
      updateBluetoothUI(data);

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
   
      document.getElementById('network-info').textContent = data.network.type || 'Inconnu';
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

    let value = parseSpeed(speed) || 0;
    const maxSpeed = 100 * 1024 * 1024;
    let percentage = (value > maxSpeed) ? 100 : (value / maxSpeed) * 100;
    percentage = (percentage < 0) ? 0 : percentage;

    // Convertir la valeur en unité appropriée
    let convertedValue = value;
    let unit = 'b/s';

    if (convertedValue >= 1024 * 1024 * 1024) {
      // Plus grand ou égal à 1 gigabit -> afficher en Gb/s
      convertedValue = convertedValue / (1024 * 1024 * 1024);
      unit = 'Gb/s';
    } else if (convertedValue >= 1024 * 1024) {
      // Plus grand ou égal à 1 mégabit -> afficher en Mb/s
      convertedValue = convertedValue / (1024 * 1024);
      unit = 'Mb/s';
    } else if (convertedValue >= 1024) {
      // Plus grand ou égal à 1 kilobit -> afficher en Kb/s
      convertedValue = convertedValue / 1024;
      unit = 'Kb/s';
    } else {
      // Sinon en bits par seconde
      unit = 'b/s';
    }

    convertedValue = convertedValue.toFixed(2);

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
    const match = speedStr.match(/([\d.]+)\s*(b\/s|kb\/s|mb\/s|gb\/s)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'gb/s': return value * 1024 * 1024 * 1024;
      case 'mb/s': return value * 1024 * 1024;
      case 'kb/s': return value * 1024;
      case 'b/s': return value;
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
updateBattery();

function updateBluetoothUI(data) {
      const bluetoothToggleBtn = document.getElementById('bluetooth-toggle');
      const bluetoothDeviceInfo = document.getElementById('bluetooth-device');
      bluetoothToggleBtn.classList.toggle('on', data.bluetooth.enabled);
      bluetoothToggleBtn.textContent = data.bluetooth.enabled ? 'ON' : 'OFF';
      bluetoothToggleBtn.setAttribute('aria-pressed', data.bluetooth.enabled);
      bluetoothDeviceInfo.textContent = `Périphérique connecté : ${data.bluetooth.device || 'Aucun'}`;
    }

    const scanBtn = document.getElementById("scan-btn");
    if (scanBtn) {
      scanBtn.addEventListener("click", scanDevices);
    }

    const connectBtn = document.getElementById("connect-button");
    if (connectBtn) {
      connectBtn.addEventListener("click", () => {
        if (!selectedDevice) return;
        connectToDevice(selectedDevice.mac);
      });
    }

function scanDevices() {
    const list = document.getElementById("paired-devices-list");
    if (!list) return;

    const scanning = document.createElement("li");
    scanning.textContent = "[ SCANNING... ]";
    scanning.classList.add("scanning-line");
    list.appendChild(scanning);

    fetch("/api/bluetooth/scan")
        .then(res => res.json())
        .then(data => {
            list.innerHTML = "";
            
            data.devices.forEach(dev => {
                const li = document.createElement("li");
                li.textContent = dev.name || dev.mac;
                if (dev.connected) li.classList.add("connected");
                list.appendChild(li);
            });
            
            renderPairedDevices(data.devices);
        })
        .catch(err => {
            list.innerHTML = "";
            const errorLi = document.createElement("li");
            errorLi.textContent = `[ ERREUR SCAN : ${err.message} ]`;
            errorLi.style.color = "red";
            list.appendChild(errorLi);
            appendTerminalCursor();
        });
}

    
function loadPairedDevices() {
    fetch("/api/bluetooth/paired")
        .then(res => res.json())
        .then(devices => {
            const list = document.getElementById("paired-devices-list");
            if (!list) return;

            list.innerHTML = "";

            devices.forEach(dev => {
                const li = document.createElement("li");
                li.textContent = dev.name || dev.mac;

                if (dev.connected) li.classList.add("connected");

                const forgetBtn = document.createElement("button");
                forgetBtn.textContent = "Oublier";
                forgetBtn.onclick = () => forgetDevice(dev.mac);

                li.appendChild(forgetBtn);
                list.appendChild(li);
            });

            
            renderPairedDevices(devices);
        });
}


function forgetDevice(mac) {
  fetch("/api/bluetooth/forget", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mac })
  }).then(loadPairedDevices);
}

let selectedDevice = null;

function renderPairedDevices(devices) {
    const list = document.getElementById("paired-devices-list");
    if (!list) return;

    list.innerHTML = "";

    const minLines = 5;
    const total = devices.length;

    for (let i = 0; i < Math.max(minLines, total); i++) {
        const li = document.createElement("li");

        if (i < total) {
            const dev = devices[i];
            li.textContent = dev.name || dev.mac;
            if (dev.connected) li.classList.add("connected");

            li.addEventListener("click", () => {
                document.querySelectorAll("#paired-devices-list li").forEach(el =>
                    el.classList.remove("selected")
                );

                li.classList.add("selected");
                selectedDevice = dev;

                const btn = document.getElementById("connect-button");
                if (btn) btn.disabled = false;
            });
        } else {
            li.innerHTML = "&nbsp;";
        }

        list.appendChild(li);
    }

    appendTerminalCursor();
}

document.getElementById("connect-button").addEventListener("click", () => {
  if (!selectedDevice) return;
  connectToDevice(selectedDevice.mac);
});

function connectToDevice(mac) {
  const pin = document.getElementById("pin-input").value.trim();
  const list = document.getElementById("paired-devices-list");

  if (!pin) {
    alert("Merci de renseigner le code PIN.");
    return;
  }

  list.innerHTML = "";
  const msg = document.createElement("li");
  msg.textContent = `[ CONNECTING TO ${mac}... ]`;
  msg.classList.add("scanning-line");
  list.appendChild(msg);

  fetch("/api/bluetooth/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mac, pin })
  })
    .then(res => res.json())
    .then(result => {
      msg.remove(); 

      const statusLi = document.createElement("li");
      if (result.status === "connected") {
        statusLi.textContent = `[ CONNECTED ✔ ]`;
        statusLi.style.color = "#00ff99";
      } else {
        statusLi.textContent = `[ FAILED ✖ ]`;
        statusLi.style.color = "orangered";
      }

      list.appendChild(statusLi);
      appendTerminalCursor();
    })
    .catch(err => {
      msg.remove();
      const errLi = document.createElement("li");
      errLi.textContent = `[ ERREUR : ${err.message} ]`;
      errLi.style.color = "red";
      list.appendChild(errLi);
      appendTerminalCursor();
    });
}

function appendTerminalCursor() {

  const oldCursor = document.querySelector(".terminal-cursor");
  if (oldCursor) oldCursor.remove();

  const cursor = document.createElement("div");
  cursor.className = "terminal-cursor";
  cursor.textContent = "▮";
  document.querySelector(".paired-devices").appendChild(cursor);
}

function showScanningLine() {
  const list = document.getElementById("paired-devices-list");
  if (!list) return;

  const scanning = document.createElement("li");
  scanning.textContent = "[ SCANNING... ]";
  scanning.classList.add("scanning-line");
  list.appendChild(scanning);
}


