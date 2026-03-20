/**
 * NeoBerry v2 — widgets/system.js
 * Jauges Chart.js doughnut (v1-style) + freq CPU, swap, throttling, top procs
 */

const SystemWidget = (() => {

  // ── Plugins Chart.js ───────────────────────────────────────────────────────

  function _arcEndColor(chart) {
    const arc = chart.getDatasetMeta(0).data[0];
    if (!arc) return '#00aaff';
    const { startAngle, endAngle, outerRadius, innerRadius, x, y } = arc;
    const r = (outerRadius + innerRadius) / 2;
    const tmp = document.createElement('canvas');
    tmp.width = chart.width; tmp.height = chart.height;
    const ctx = tmp.getContext('2d');
    const g = ctx.createConicGradient(startAngle, x, y);
    g.addColorStop(0.00, '#00aaff'); g.addColorStop(0.25, '#39d353');
    g.addColorStop(0.50, '#fed33c'); g.addColorStop(0.75, '#fe9a4a');
    g.addColorStop(1.00, '#fe4a4a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, tmp.width, tmp.height);
    const px = Math.max(0, Math.round(x + r * Math.cos(endAngle)));
    const py = Math.max(0, Math.round(y + r * Math.sin(endAngle)));
    const d = ctx.getImageData(px, py, 1, 1).data;
    return `rgba(${d[0]},${d[1]},${d[2]},${d[3]/255})`;
  }

  function _registerPlugins() {
    if (!window.Chart) return;
    if (!Chart.registry.plugins.get('nbGradArc')) {
      Chart.register({
        id: 'nbGradArc',
        afterDraw(chart) {
          const arc = chart.getDatasetMeta(0).data[0];
          if (!arc) return;
          const { startAngle, endAngle, innerRadius, outerRadius, x, y } = arc;
          const ctx = chart.ctx;
          const g = ctx.createConicGradient(startAngle, x, y);
          g.addColorStop(0.00, '#00aaff'); g.addColorStop(0.25, '#39d353');
          g.addColorStop(0.50, '#fed33c'); g.addColorStop(0.75, '#fe9a4a');
          g.addColorStop(1.00, '#fe4a4a');
          ctx.save();
          ctx.lineWidth = outerRadius - innerRadius;
          ctx.strokeStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, (outerRadius + innerRadius) / 2, startAngle, endAngle);
          ctx.stroke();
          ctx.restore();
        },
      });
    }
    if (!Chart.registry.plugins.get('nbLabel')) {
      Chart.register({
        id: 'nbLabel',
        afterDraw(chart) {
          if (!chart._nbConfig) return;
          const { ctx, width, height } = chart;
          const raw   = chart._nbRaw ?? '0';
          const unit  = chart._nbConfig.unit || '%';
          const label = chart._nbConfig.label || '';
          const color = _arcEndColor(chart);
          ctx.save();
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.font = '700 20px Poppins, Inter, sans-serif';
          ctx.fillStyle = color;
          ctx.fillText(`${raw}${unit}`, width / 2, height * 0.62 + 2);
          ctx.font = '400 11px Poppins, Inter, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,.7)';
          ctx.fillText(label, width / 2, height * 0.62 + 38);
          ctx.restore();
        },
      });
    }
  }

  function _makeChart(id, cfg) {
    const canvas = document.getElementById(id);
    if (!canvas || !window.Chart) return null;
    const chart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: [cfg.label, ''],
        datasets: [{ data: [0, 100],
          backgroundColor: ['rgba(0,0,0,0)', 'rgba(44,44,44,0.75)'],
          borderColor: 'transparent', borderWidth: 0, cutout: '75%' }],
      },
      options: {
        responsive: true, aspectRatio: 1,
        rotation: -108, circumference: 216,
        animation: { duration: 600 },
        plugins: { tooltip: { enabled: false }, legend: { display: false } },
      },
      plugins: ['nbGradArc', 'nbLabel'],
    });
    chart._nbConfig = cfg; chart._nbRaw = '0';
    return chart;
  }

  // ── Config jauges ─────────────────────────────────────────────────────────

  const GAUGES = [
    { id: 'g-cpu',  label: 'Charge CPU',  unit: '%',  max: 100, get: d => d.cpu_percent  },
    { id: 'g-temp', label: 'T° CPU',       unit: '°C', max: 90,  get: d => d.cpu_temp     },
    { id: 'g-ram',  label: 'Charge RAM',   unit: '%',  max: 100, get: d => d.ram?.percent },
    { id: 'g-card', label: 'T° Carte',     unit: '°C', max: 80,  get: d => d.card_temp    },
  ];

  const _charts = {};
  let _ready = false;

  // ── Setup DOM ──────────────────────────────────────────────────────────────

  function _setup() {
    if (_ready) return;
    const c = document.getElementById('system-gauges');
    if (!c) return;
    _registerPlugins();

    c.innerHTML = `
      <!-- Jauges doughnut -->
      <div class="sys-gauges-row">
        ${GAUGES.map(g => `
          <div class="gauge-wrap">
            <canvas id="${g.id}" style="max-width:140px;max-height:140px;"></canvas>
          </div>`).join('')}
      </div>

      <!-- Fréquence CPU + Swap -->
      <div class="sys-extra-row">
        <div class="sys-extra-card" id="sys-freq-card">
          <div class="sys-extra-title">⚡ Fréquence CPU</div>
          <div class="sys-extra-val" id="sys-freq-val">— MHz</div>
          <div class="sys-extra-sub" id="sys-freq-range"></div>
        </div>
        <div class="sys-extra-card" id="sys-swap-card">
          <div class="sys-extra-title">🔄 Swap</div>
          <div class="sys-extra-val" id="sys-swap-val">—</div>
          <div class="sys-extra-sub" id="sys-swap-bar-wrap" style="margin-top:6px">
            <div class="sys-mini-bar-bg">
              <div class="sys-mini-bar-fill" id="sys-swap-bar" style="width:0%"></div>
            </div>
          </div>
        </div>
        <div class="sys-extra-card sys-throttle-card" id="sys-throttle-card">
          <div class="sys-extra-title">🛡 Throttling</div>
          <div class="sys-extra-val" id="sys-throttle-val" style="font-size:.9rem">—</div>
          <div id="sys-throttle-flags" style="margin-top:4px"></div>
        </div>
      </div>

      <!-- Top 5 processus -->
      <div class="sys-proc-section">
        <div class="sys-proc-title">📋 Top processus</div>
        <div id="sys-proc-list" class="sys-proc-list"></div>
      </div>
    `;

    GAUGES.forEach(g => { _charts[g.id] = _makeChart(g.id, g); });
    _ready = true;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _fmtBytes(b) {
    if (!b) return '0 B';
    if (b < 1048576)    return `${(b/1024).toFixed(0)} KB`;
    if (b < 1073741824) return `${(b/1048576).toFixed(0)} MB`;
    return `${(b/1073741824).toFixed(1)} GB`;
  }

  function _el(id) { return document.getElementById(id); }

  // ── Update ────────────────────────────────────────────────────────────────

  function update(data) {
    _setup();

    // Jauges doughnut
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

    // Fréquence CPU
    const freq = data.cpu_freq;
    if (freq && _el('sys-freq-val')) {
      _el('sys-freq-val').textContent = `${freq.current} MHz`;
      if (freq.min && freq.max) {
        _el('sys-freq-range').textContent = `${freq.min} – ${freq.max} MHz`;
      }
    }

    // Swap
    const swap = data.swap;
    if (swap && _el('sys-swap-val')) {
      if (!swap.available || swap.total === 0) {
        _el('sys-swap-val').textContent = 'Non configuré';
        if (_el('sys-swap-bar-wrap')) _el('sys-swap-bar-wrap').style.display = 'none';
      } else {
        _el('sys-swap-val').textContent = `${_fmtBytes(swap.used)} / ${_fmtBytes(swap.total)}`;
        const pct = swap.percent || 0;
        const bar = _el('sys-swap-bar');
        if (bar) {
          bar.style.width   = `${pct}%`;
          bar.style.background = pct > 75 ? '#ff4444' : pct > 50 ? '#fe9a4a' : '#39d353';
        }
      }
    }

    // Throttling
    const thr = data.throttling;
    if (thr && _el('sys-throttle-val')) {
      const card = _el('sys-throttle-card');
      if (!thr.available) {
        _el('sys-throttle-val').textContent = 'Non dispo (hors RPi)';
        _el('sys-throttle-val').style.color = 'var(--txt-3)';
      } else if (thr.ok) {
        _el('sys-throttle-val').innerHTML = '<span style="color:#39d353">✓ Tout va bien</span>';
        if (card) card.style.borderColor = 'rgba(57,211,83,.3)';
      } else {
        const problems = [];
        if (thr.undervoltage) problems.push('⚡ Sous-tension');
        if (thr.throttled)    problems.push('🌡 Throttling');
        _el('sys-throttle-val').innerHTML =
          `<span style="color:#ff4444">${problems.join(' · ') || '⚠ Problème'}</span>`;
        if (card) card.style.borderColor = 'rgba(255,68,68,.4)';
        // Flags détail
        const flagsEl = _el('sys-throttle-flags');
        if (flagsEl && thr.flags?.length) {
          flagsEl.innerHTML = thr.flags
            .filter(f => f.current)
            .map(f => `<div style="font-size:.65rem;color:#ff9944;margin-top:2px">⚠ ${f.label}</div>`)
            .join('');
        }
      }
    }

    // Top processus
    const procs = data.top_procs;
    const list  = _el('sys-proc-list');
    if (procs && list) {
      if (!procs.length) {
        list.innerHTML = '<span style="color:var(--txt-3);font-size:.75rem">Aucun processus</span>';
        return;
      }
      list.innerHTML = procs.map((p, i) => {
        const cpuW = Math.min(100, p.cpu);
        const memW = Math.min(100, p.mem * 5); // *5 pour visibilité
        const cpuColor = p.cpu > 50 ? '#fe4a4a' : p.cpu > 20 ? '#fe9a4a' : '#39d353';
        return `
          <div class="sys-proc-row">
            <span class="sys-proc-name" title="${p.name} (PID ${p.pid})">${p.name}</span>
            <div class="sys-proc-bars">
              <div class="sys-proc-bar-wrap" title="CPU: ${p.cpu}%">
                <div class="sys-proc-bar" style="width:${cpuW}%;background:${cpuColor}"></div>
              </div>
              <div class="sys-proc-bar-wrap" title="RAM: ${p.mem}%">
                <div class="sys-proc-bar" style="width:${memW}%;background:#00aaff"></div>
              </div>
            </div>
            <span class="sys-proc-vals">${p.cpu}% <span style="color:#00aaff">${p.mem}%</span></span>
          </div>`;
      }).join('');
    }
  }

  return { update };
})();
