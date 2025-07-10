let batteryChart = null;

/**
 * Met à jour visuellement le niveau de batterie dans l'interface.
 */
export function updateBatteryGauge(data) {
   const percent = Math.round(data.percent * 10) / 10;
   const fill = document.getElementById('battery-fill');
   const percentDisplay = document.getElementById('battery-percent');
   let color = '#39d353'; // Vert (par défaut)

   if (percent < 25) color = '#ff0000';      // Rouge
   else if (percent < 50) color = '#ff8000'; // Orange
   else if (percent < 75) color = '#ffff00'; // Jaune

   fill.style.width = `${percent}%`;
   fill.style.background = color;
   percentDisplay.textContent = `${percent}%`;

   if (data.no_battery_detected) {
      fill.title = 'Aucune batterie détectée.';
   } else {
      fill.title = '';
   }
}

/**
 * Initialise le graphique d'historique batterie.
 */
function initBatteryChart() {
   const ctx = document.getElementById('battery-chart')?.getContext('2d');
   if (!ctx) return;

   batteryChart = new Chart(ctx, {
      type: 'line',
      data: {
         labels: Array.from({ length: 60 }, (_, i) => i),
         datasets: [
            {
               label: 'Charge (%)',
               data: [],
               borderColor: '#db0038',
               fill: false,
               tension: 0.2,
            },
         ],
      },
      options: {
         responsive: true,
         maintainAspectRatio: false,
         animation: false,
         scales: {
            y: {
               beginAtZero: true,
               max: 100,
               ticks: { color: '#ffffffcc' },
               grid: { color: '#333' },
            },
            x: {
               display: false,
               grid: { color: '#222' },
            },
         },
         plugins: {
            legend: {
               labels: {
                  color: '#ffffffcc',
               },
            },
         },
      },
   });
}

/**
 * Met à jour les jauges et l'historique de la batterie.
 */
export function updateBattery() {
   fetch('/api/battery')
      .then((res) => res.json())
      .then((data) => {
         updateBatteryGauge(data);

         const status = document.getElementById('battery-status');
         if (status) {
            if (data.power_plugged) {
               status.textContent = 'Branché directement';
            } else if (data.secsleft) {
               const minutes = Math.floor(data.secsleft / 60);
               status.textContent = `Temps restant : ${minutes} min`;
            } else {
               status.textContent = 'Temps restant inconnu';
            }
         }

         const fill = document.getElementById('battery-fill');
         if (fill) {
            if (data.power_plugged && data.percent < 100) {
               fill.classList.add('charging');
            } else {
               fill.classList.remove('charging');
            }
         }
      });

}

/**
 * Initialise le module batterie.
 */
export function initBatteryModule() {
   initBatteryChart();
   updateBattery();
   setInterval(updateBattery, 5000);
}

