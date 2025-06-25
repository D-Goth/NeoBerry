// 🎨 Couleurs pour les jauges classiques
function getPointColor(value) {
  if (value < 20) return '#00aaff';
  if (value < 50) return '#39d353';
  if (value < 80) return '#fed33c';
  if (value < 90) return '#fe9a4a';
  return '#fe4a4a';
}

// ⚡ Couleurs pour les niveaux de tension (0 à 3)
function getVoltageColor(level) {
  return ['#3498db', '#e74c3c', '#f1c40f', '#2ecc71'][level] ?? '#888';
}

// 🅿️ Police et style global par défaut
Chart.defaults.font.family = 'Poppins';
Chart.defaults.font.size = 12;
Chart.defaults.color = '#ccc';

// 📦 Lecture des données classiques (tension)
async function fetchGraphData(url) {
  const res = await fetch(url);
  const json = await res.json();
  return {
    labels: json.map(item => item.hour),
    data: json.map(item => item.value)
  };
}

// 📦 Lecture des données réseau double (down + up)
async function fetchNetworkGraphData(url) {
  const res = await fetch(url);
  const json = await res.json();
  return {
    labels: json.map(item => item.hour),
    down: json.map(item => item.down),
    up: json.map(item => item.up)
  };
}

// 📊 Graphe ligne simple (tension)
async function renderLineGraph({
  canvasId,
  url,
  unit,
  colorLine,
  yRange,
  formatY = null,
  useVoltageColors = false
}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const { labels, data } = await fetchGraphData(url);

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 180);
  gradient.addColorStop(0, `${colorLine}55`);
  gradient.addColorStop(1, `${colorLine}03`);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        fill: true,
        backgroundColor: gradient,
        borderColor: colorLine,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: data.map(
          v => useVoltageColors ? getVoltageColor(Math.round(v)) : getPointColor(v)
        )
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#aaa', font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          min: yRange.min,
          max: yRange.max,
          ticks: {
            color: '#ccc',
            stepSize: 1,
            callback: val =>
              formatY ? formatY(val) : `${val} ${unit}`,
            align: 'start',
            crossAlign: 'near',
            padding: 12
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx =>
              formatY
                ? `Tension : ${formatY(ctx.parsed.y)}`
                : `${ctx.parsed.y ?? '—'} ${unit}`
          }
        }
      }
    }
  });
}

// 📊 Graphe double ligne (internet)
async function renderDoubleLineGraph({
  canvasId,
  url,
  unit,
  yRange
}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const { labels, down, up } = await fetchNetworkGraphData(url);
  const chartCtx = ctx.getContext('2d');

  const gradientDown = chartCtx.createLinearGradient(0, 0, 0, 180);
  gradientDown.addColorStop(0, '#00c2ff55');
  gradientDown.addColorStop(1, '#00c2ff03');

  const gradientUp = chartCtx.createLinearGradient(0, 0, 0, 180);
  gradientUp.addColorStop(0, '#00cc6655');
  gradientUp.addColorStop(1, '#00cc6603');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Download',
          data: down,
          fill: true,
          backgroundColor: gradientDown,
          borderColor: '#00c2ff',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: down.map(v => getPointColor(v))
        },
        {
          label: 'Upload',
          data: up,
          fill: true,
          backgroundColor: gradientUp,
          borderColor: '#00cc66',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: up.map(v => getPointColor(v))
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#aaa', font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          min: yRange.min,
          max: yRange.max,
          ticks: {
            color: '#ccc',
            stepSize: 10,
            callback: val => `${val} ${unit}`,
            padding: 12
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: { color: '#ccc', boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label} : ${ctx.parsed.y} ${unit}`
          }
        }
      }
    }
  });
}

// 📶 Graphe Connexion Internet
renderDoubleLineGraph({
  canvasId: 'internet-graph',
  url: '/api/graph/connexion',
  unit: 'Mb/s',
  yRange: { min: 0, max: 100 }
});

// ⚡ Graphe Stabilité Électrique
renderLineGraph({
  canvasId: 'power-graph',
  url: '/api/graph/electric',
  unit: '',
  colorLine: '#00cc66',
  yRange: { min: 0, max: 3 },
  useVoltageColors: true,
  formatY: val => {
    const levels = ['Neutre  🔵', 'Faible  🔴', 'Instable  🟡', 'Stable  🟢'];
    return levels[val] ?? '';
  }
});

