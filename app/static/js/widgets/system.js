/**
 * NeoBerry v2 — widgets/system.js
 * Animated arc gauges: CPU load, CPU temp, RAM, card temp.
 */

const SystemWidget = (() => {
  const CIRC = 219.91; // 270° arc at r=46

  const GAUGES = [
    { id: 'cpu-percent', label: 'CPU',      getValue: d => d.cpu_percent,  unit: '%',  color: 'cyan',  max: 100 },
    { id: 'cpu-temp',    label: 'T° CPU',   getValue: d => d.cpu_temp,     unit: '°C', color: 'amber', max: 90  },
    { id: 'ram-percent', label: 'RAM',      getValue: d => d.ram?.percent, unit: '%',  color: 'cyan',  max: 100 },
    { id: 'card-temp',   label: 'T° Carte', getValue: d => d.card_temp,    unit: '°C', color: 'green', max: 80  },
  ];

  function _makeGauge(cfg) {
    return `<div class="gauge-wrap">
      <div class="gauge">
        <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <circle class="gauge__track" cx="60" cy="60" r="46" stroke-dasharray="${CIRC}" stroke-dashoffset="0"/>
          <circle class="gauge__arc gauge__arc--${cfg.color}" id="gauge-arc-${cfg.id}"
            cx="60" cy="60" r="46" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/>
        </svg>
        <div class="gauge__center">
          <span class="gauge__value" id="gauge-val-${cfg.id}">—</span>
          <span class="gauge__unit">${cfg.unit}</span>
        </div>
      </div>
      <span class="gauge__label">${cfg.label}</span>
    </div>`;
  }

  let _init = false;

  function _setup() {
    if (_init) return;
    const c = document.getElementById('system-gauges');
    if (!c) return;
    c.innerHTML = GAUGES.map(_makeGauge).join('');
    _init = true;
  }

  function update(data) {
    _setup();
    GAUGES.forEach(cfg => {
      const raw = cfg.getValue(data);
      if (raw == null) return;
      const pct    = Math.min(100, Math.max(0, (raw / cfg.max) * 100));
      const offset = CIRC - (CIRC * pct / 100);
      const arc = document.getElementById(`gauge-arc-${cfg.id}`);
      const val = document.getElementById(`gauge-val-${cfg.id}`);
      if (arc) {
        arc.style.strokeDashoffset = offset;
        arc.className = 'gauge__arc gauge__arc--' + (pct > 85 ? 'red' : pct > 65 ? 'amber' : cfg.color);
      }
      if (val) val.textContent = typeof raw === 'number' ? raw.toFixed(1) : '—';
    });
  }

  return { update };
})();
