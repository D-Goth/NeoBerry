/**
 * NeoBerry v2 — widgets/system.js
 * Jauges arc avec gradient dynamique : bleu→vert→jaune→orange→rouge→violet
 */

const SystemWidget = (() => {
  const CIRC = 219.91;

  // Gradient basse→haute valeur (stops en %)
  const GRADIENT_STOPS = [
    [0,   [0,   212, 255]],   // bleu
    [25,  [0,   232, 135]],   // vert
    [50,  [255, 230, 0  ]],   // jaune
    [75,  [255, 140, 0  ]],   // orange
    [90,  [255,  68, 68 ]],   // rouge
    [100, [204,   0, 255]],   // violet
  ];

  function _lerp(a, b, t) { return Math.round(a + (b - a) * t); }

  function _pctToColor(pct) {
    for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
      const [p0, c0] = GRADIENT_STOPS[i];
      const [p1, c1] = GRADIENT_STOPS[i + 1];
      if (pct >= p0 && pct <= p1) {
        const t = (pct - p0) / (p1 - p0);
        const r = _lerp(c0[0], c1[0], t);
        const g = _lerp(c0[1], c1[1], t);
        const b = _lerp(c0[2], c1[2], t);
        return `rgb(${r},${g},${b})`;
      }
    }
    return `rgb(${GRADIENT_STOPS[GRADIENT_STOPS.length-1][1].join(',')})`;
  }

  const GAUGES = [
    { id: 'cpu-percent', label: 'CPU',      getValue: d => d.cpu_percent,  unit: '%',  max: 100 },
    { id: 'cpu-temp',    label: 'T° CPU',   getValue: d => d.cpu_temp,     unit: '°C', max: 90  },
    { id: 'ram-percent', label: 'RAM',      getValue: d => d.ram?.percent, unit: '%',  max: 100 },
    { id: 'card-temp',   label: 'T° Carte', getValue: d => d.card_temp,    unit: '°C', max: 80  },
  ];

  function _makeGauge(cfg) {
    return `<div class="gauge-wrap">
      <div class="gauge">
        <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <circle class="gauge__track" cx="60" cy="60" r="46"
            stroke-dasharray="${CIRC} 73.3" stroke-dashoffset="0"/>
          <circle class="gauge__arc" id="gauge-arc-${cfg.id}"
            cx="60" cy="60" r="46"
            stroke-dasharray="${CIRC} 73.3" stroke-dashoffset="${CIRC}"/>
        </svg>
        <div class="gauge__center">
          <span class="gauge__value" id="gauge-val-${cfg.id}">—</span>
          <span class="gauge__unit">${cfg.unit}</span>
        </div>
      </div>
      <span class="gauge__label">${cfg.label}</span>
    </div>`;
  }

  let _ready = false;
  function _setup() {
    if (_ready) return;
    const c = document.getElementById('system-gauges');
    if (!c) return;
    c.innerHTML = GAUGES.map(_makeGauge).join('');
    _ready = true;
  }

  function update(data) {
    _setup();
    GAUGES.forEach(cfg => {
      const raw = cfg.getValue(data);
      if (raw == null) return;
      const pct    = Math.min(100, Math.max(0, (raw / cfg.max) * 100));
      const offset = CIRC - (CIRC * pct / 100);
      const color  = _pctToColor(pct);

      const arc = document.getElementById(`gauge-arc-${cfg.id}`);
      const val = document.getElementById(`gauge-val-${cfg.id}`);
      if (arc) { arc.style.strokeDashoffset = offset; arc.style.stroke = color; }
      if (val)   val.textContent = typeof raw === 'number' ? raw.toFixed(1) : '—';
    });
  }

  return { update };
})();
