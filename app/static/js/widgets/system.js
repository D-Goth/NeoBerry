/**
 * NeoBerry v2 — widgets/system.js
 * Chart.js doughnut, copie fidèle de la v1 :
 *   rotation: -108°  circumference: 216°  cutout: 75%
 *   gradient conique  #00aaff → #39d353 → #fed33c → #fe9a4a → #fe4a4a
 */

const SystemWidget = (() => {

  // ── Couleur au bout de l'arc (pixel sampling sur canvas temporaire) ────────
  function _arcEndColor(chart) {
    const arc = chart.getDatasetMeta(0).data[0];
    if (!arc) return '#ffffff';
    const { startAngle, endAngle, outerRadius, innerRadius, x, y } = arc;
    const r   = (outerRadius + innerRadius) / 2;
    const tmp = document.createElement('canvas');
    tmp.width = chart.width; tmp.height = chart.height;
    const ctx = tmp.getContext('2d');
    const g   = ctx.createConicGradient(startAngle, x, y);
    g.addColorStop(0.00, '#00aaff');
    g.addColorStop(0.25, '#39d353');
    g.addColorStop(0.50, '#fed33c');
    g.addColorStop(0.75, '#fe9a4a');
    g.addColorStop(1.00, '#fe4a4a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, tmp.width, tmp.height);
    const px = Math.round(x + r * Math.cos(endAngle));
    const py = Math.round(y + r * Math.sin(endAngle));
    const d  = ctx.getImageData(Math.max(0,px), Math.max(0,py), 1, 1).data;
    return `rgba(${d[0]},${d[1]},${d[2]},${d[3]/255})`;
  }

  // ── Plugins Chart.js ───────────────────────────────────────────────────────
  function _registerPlugins() {
    if (!window.Chart) return;

    // Gradient conique sur l'arc de remplissage
    if (!Chart.registry.plugins.get('nbGradArc')) {
      Chart.register({
        id: 'nbGradArc',
        afterDraw(chart) {
          const meta = chart.getDatasetMeta(0);
          const arc  = meta.data[0];
          if (!arc) return;
          const { startAngle, endAngle, innerRadius, outerRadius, x, y } = arc;
          const ctx  = chart.ctx;
          const grad = ctx.createConicGradient(startAngle, x, y);
          grad.addColorStop(0.00, '#00aaff');
          grad.addColorStop(0.25, '#39d353');
          grad.addColorStop(0.50, '#fed33c');
          grad.addColorStop(0.75, '#fe9a4a');
          grad.addColorStop(1.00, '#fe4a4a');
          ctx.save();
          ctx.lineWidth   = outerRadius - innerRadius;
          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, (outerRadius + innerRadius) / 2, startAngle, endAngle);
          ctx.stroke();
          ctx.restore();
        },
      });
    }

    // Texte centré : valeur brute + label
    if (!Chart.registry.plugins.get('nbLabel')) {
      Chart.register({
        id: 'nbLabel',
        afterDraw(chart) {
          if (!chart._nbConfig) return;
          const { ctx, width, height } = chart;
          const raw   = chart._nbRaw ?? chart.data.datasets[0].data[0];
          const unit  = chart._nbConfig.unit || '%';
          const label = chart._nbConfig.label || '';
          const color = _arcEndColor(chart);

          ctx.save();
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'bottom';
          ctx.font         = '700 22px Poppins, Inter, sans-serif';
          ctx.fillStyle    = color;
          ctx.fillText(`${raw}${unit}`, width / 2, height * 0.62 + 2);
          ctx.font         = '400 12px Poppins, Inter, sans-serif';
          ctx.fillStyle    = 'rgba(255,255,255,.75)';
          ctx.fillText(label, width / 2, height * 0.62 + 40);
          ctx.restore();
        },
      });
    }
  }

  // ── Fabrique une jauge ────────────────────────────────────────────────────
  function _makeChart(canvasId, cfg) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return null;
    const chart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels:   [cfg.label, ''],
        datasets: [{
          data:            [0, 100],
          backgroundColor: ['rgba(0,0,0,0)', 'rgba(44,44,44,0.75)'],
          borderColor:     'transparent',
          borderWidth:     0,
          cutout:          '75%',
        }],
      },
      options: {
        responsive:    true,
        aspectRatio:   1,
        rotation:      -108,
        circumference: 216,
        animation:     { duration: 600 },
        plugins: {
          tooltip: { enabled: false },
          legend:  { display: false },
        },
      },
      plugins: ['nbGradArc', 'nbLabel'],
    });
    chart._nbConfig = cfg;
    chart._nbRaw    = '0';
    return chart;
  }

  // ── Config des 4 jauges ───────────────────────────────────────────────────
  const GAUGES = [
    { id: 'gauge-cpu',  label: 'Charge CPU',  unit: '%',  max: 100, get: d => d.cpu_percent  },
    { id: 'gauge-temp', label: 'T° CPU',       unit: '°C', max: 90,  get: d => d.cpu_temp     },
    { id: 'gauge-ram',  label: 'Charge RAM',   unit: '%',  max: 100, get: d => d.ram?.percent },
    { id: 'gauge-card', label: 'T° Carte',     unit: '°C', max: 80,  get: d => d.card_temp    },
  ];

  const _charts = {};
  let   _ready  = false;

  function _setup() {
    if (_ready) return;
    const container = document.getElementById('system-gauges');
    if (!container) return;

    _registerPlugins();

    container.innerHTML = GAUGES.map(g => `
      <div class="gauge-wrap">
        <canvas id="${g.id}" style="max-width:150px;max-height:150px;"></canvas>
      </div>`).join('');

    GAUGES.forEach(g => { _charts[g.id] = _makeChart(g.id, g); });
    _ready = true;
  }

  function update(data) {
    _setup();
    GAUGES.forEach(g => {
      const chart = _charts[g.id];
      if (!chart) return;
      const raw = g.get(data);
      if (raw == null) return;
      const pct = Math.min(100, Math.max(0, (raw / g.max) * 100));
      chart.data.datasets[0].data = [pct, 100 - pct];
      chart._nbRaw = typeof raw === 'number' ? raw.toFixed(1) : String(raw);
      chart.update('active');
    });
  }

  return { update };
})();
