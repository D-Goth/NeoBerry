export function getGaugeColor(value) {
   if (value < 10) return '#00aaff';
   if (value < 25) return '#30d5c8';
   if (value < 50) return '#39d353';
   if (value < 70) return '#fed33c';
   if (value < 90) return '#fe9a4a';
   return '#fe4a4a';
}

// Plugins personnalisés
Chart.register({
   id: 'defaultDoughnutLabel',
   afterDraw(chart) {
      const { ctx, data } = chart;
      const { width, height } = chart;
      if (!chart.options.plugins.customNetworkLabel) {
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
   },
});

Chart.register({
   id: 'customNetworkLabel',
   afterDraw(chart) {
      const { ctx, data } = chart;
      const { width, height } = chart;
      if (chart.options.plugins.customNetworkLabel) {
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
   },
});

export function createGauge(ctx, label, initialValue = 0, isNetworkGauge = false) {
   return new Chart(ctx, {
      type: 'doughnut',
      data: {
         labels: [label, 'Libre'],
         datasets: [
            {
               label,
               data: [initialValue, 100 - initialValue],
               backgroundColor: [getGaugeColor(initialValue), 'rgba(44, 44, 44, 0.75)'],
               borderWidth: 0,
               cutout: '75%',
            },
         ],
      },
      options: {
         responsive: true,
         aspectRatio: 1,
         animation: true,
         plugins: {
            tooltip: { enabled: false },
            legend: { display: false },
            customNetworkLabel: isNetworkGauge,
         },
      },
      plugins: isNetworkGauge
         ? [{ id: 'customNetworkLabel' }]
         : [{ id: 'defaultDoughnutLabel' }],
   });
}

// Jauges exportées une fois le DOM chargé
export let cpuLoadGauge, cpuTempGauge, ramLoadGauge, boardTempGauge;
export let diskCapacityGauge, diskWriteGauge, diskReadGauge;
export let bluetoothQualityGauge, wifiStrengthGauge;

export function initGauges() {
   cpuLoadGauge = createGauge(document.getElementById('cpu-load-gauge').getContext('2d'), 'Charge CPU');
   cpuTempGauge = createGauge(document.getElementById('cpu-temp-gauge').getContext('2d'), 'T° CPU');
   ramLoadGauge = createGauge(document.getElementById('ram-load-gauge').getContext('2d'), 'Charge RAM');
   boardTempGauge = createGauge(document.getElementById('board-temp-gauge').getContext('2d'), 'T° Carte');

   diskCapacityGauge = createGauge(document.getElementById('disk-capacity-gauge').getContext('2d'), 'Capacité Stockage');
   diskWriteGauge = createGauge(document.getElementById('disk-write-gauge').getContext('2d'), 'Écriture Disque');
   diskReadGauge = createGauge(document.getElementById('disk-read-gauge').getContext('2d'), 'Lecture Disque');

   bluetoothQualityGauge = createGauge(document.getElementById('bluetooth-quality-gauge').getContext('2d'), 'Qualité Bluetooth');
   wifiStrengthGauge = createGauge(document.getElementById('wifi-strength-gauge').getContext('2d'), 'Puissance WiFi', 0, true);
}

