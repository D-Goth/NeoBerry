async function fetchGraphData(url) {
  const res = await fetch(url);
  const json = await res.json();
  return {
    labels: json.map(item => item.hour),
    data: json.map(item => item.value)
  };
}

async function renderGraph({ canvasId, url, unit, colorFn, yScale }) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const { labels, data } = await fetchGraphData(url);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map(colorFn)
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
          min: yScale.min,
          max: yScale.max,
          ticks: {
            color: '#888',
            stepSize: yScale.step,
            callback: v => `${v} ${unit}`
          },
          grid: { display: true, color: 'rgba(255,255,255,0.05)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.y ?? '—'} ${unit}`
          }
        }
      }
    }
  });
}

// 📶 Connexion Internet (Mb/s)
renderGraph({
  canvasId: 'internet-graph',
  url: '/api/graph/connexion',
  unit: 'Mb/s',
  yScale: { min: 0, max: 100, step: 20 },
  colorFn: val =>
    val === 0 ? '#e74c3c' :     // coupure
    val < 10 ? '#e67e22' :      // très bas
    val < 30 ? '#f1c40f' :      // moyen
    '#00c2ff'                   // normal
});

// ⚡ Tension (V)
renderGraph({
  canvasId: 'power-graph',
  url: '/api/graph/electric',
  unit: 'V',
  yScale: { min: 4.5, max: 5.2, step: 0.1 },
  colorFn: val =>
    val === 0 ? '#e74c3c' :
    val < 4.7 ? '#e67e22' :
    '#00cc66'
});

