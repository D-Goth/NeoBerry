export function getGaugeColor(value) {
   if (value < 20) return '#00aaff';
   if (value < 50) return '#39d353';
   if (value < 80) return '#fed33c';
   if (value < 90) return '#fe9a4a';
   return '#fe4a4a';
}

// 🔍 Couleur de l’angle atteint par la jauge
function getColorAtValueAngle(chart) {
   const dataset = chart.data.datasets[0];
   const meta = chart.getDatasetMeta(0);
   const arc = meta.data[0];
   if (!arc) return '#ffffff';

   const { endAngle, x, y, outerRadius, innerRadius } = arc;
   const radius = (outerRadius + innerRadius) / 2;

   const tempCanvas = document.createElement('canvas');
   tempCanvas.width = chart.width;
   tempCanvas.height = chart.height;
   const ctx = tempCanvas.getContext('2d');

   const gradient = ctx.createConicGradient(arc.startAngle, x, y);
   gradient.addColorStop(0.0, '#00aaff');
   gradient.addColorStop(0.25, '#39d353');
   gradient.addColorStop(0.5, '#fed33c');
   gradient.addColorStop(0.75, '#fe9a4a');
   gradient.addColorStop(1.0, '#fe4a4a');

   ctx.fillStyle = gradient;
   ctx.fillRect(0, 0, chart.width, chart.height);

   const px = Math.round(x + radius * Math.cos(endAngle));
   const py = Math.round(y + radius * Math.sin(endAngle));
   const data = ctx.getImageData(px, py, 1, 1).data;

   return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
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
         ctx.fillStyle = getColorAtValueAngle(chart);
         ctx.textAlign = 'center';
         ctx.textBaseline = 'bottom';
         ctx.fillText(data.datasets[0].data[0] + '%', width / 2, height * 0.62 + 2);
         ctx.font = '400 12px Poppins';
         ctx.fillStyle = '#ffffffcc';
         ctx.fillText(data.labels[0], width / 2, height * 0.62 + 40);
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
         ctx.fillStyle = getColorAtValueAngle(chart);
         ctx.textAlign = 'center';
         ctx.textBaseline = 'bottom';
         const valueToDisplay = chart.valueToDisplay || data.datasets[0].data[0];
         ctx.fillText(valueToDisplay, width / 2, height * 0.62 + 2);
         ctx.font = '400 12px Poppins';
         ctx.fillStyle = '#ffffffcc';
         ctx.fillText(data.labels[0], width / 2, height * 0.62 + 40);
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
               borderColor: 'transparent',
               hoverBorderColor: 'transparent',
               borderWidth: 0,
               hoverBorderWidth: 0,
               cutout: '75%',
            },
         ],
      },
      options: {
         responsive: true,
         aspectRatio: 1,
         rotation: -108,
         circumference: 216,
         animation: true,
         plugins: {
            tooltip: { enabled: false },
            legend: { display: false },
            customNetworkLabel: isNetworkGauge,
         },
      },
      plugins: isNetworkGauge
         ? [{ id: 'customNetworkLabel' }, 'gradientArcRenderer']
         : [{ id: 'defaultDoughnutLabel' }, 'gradientArcRenderer'],
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

   bluetoothQualityGauge = createGauge(document.getElementById('bluetooth-quality-gauge').getContext('2d'), 'Réception Bluetooth');
   wifiStrengthGauge = createGauge(document.getElementById('wifi-strength-gauge').getContext('2d'), 'Réception WiFi', 0, true);
}

// Plugin du dégradé en arc circulaire
Chart.register({
   id: 'gradientArcRenderer',
   afterDraw(chart) {
      const dataset = chart.data.datasets[0];
      const meta = chart.getDatasetMeta(0);
      const arc = meta.data[0];
      if (!arc) return;

      const { startAngle, endAngle, innerRadius, outerRadius, x, y } = arc;
      const ctx = chart.ctx;

      const gradient = ctx.createConicGradient(startAngle, x, y);
      gradient.addColorStop(0.0, '#00aaff');   // 0%
      gradient.addColorStop(0.25, '#39d353');  // 25%
      gradient.addColorStop(0.5, '#fed33c');   // 50%
      gradient.addColorStop(0.75, '#fe9a4a');  // 75%
      gradient.addColorStop(1.0, '#fe4a4a');   // 100%

      ctx.save();
      ctx.lineWidth = outerRadius - innerRadius;
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, (outerRadius + innerRadius) / 2, startAngle, endAngle);
      ctx.stroke();
      ctx.restore();
   }
});

