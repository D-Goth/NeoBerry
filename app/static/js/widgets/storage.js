/**
 * NeoBerry v2 — widgets/storage.js
 * Disk usage gauge + read/write throughput.
 */

const StorageWidget = (() => {
  const CIRC = 219.91;
  let _init = false;

  function _fmt(bytes) {
    if (bytes < 1024)    return `${bytes.toFixed(0)} B/s`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / 1048576).toFixed(2)} MB/s`;
  }

  function _setup() {
    if (_init) return;
    const c = document.getElementById('storage-gauges');
    if (!c) return;
    c.innerHTML = `
      <div class="gauge-wrap">
        <div class="gauge">
          <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <circle class="gauge__track" cx="60" cy="60" r="46"
              stroke-dasharray="${CIRC}" stroke-dashoffset="0"/>
            <circle class="gauge__arc gauge__arc--amber" id="disk-arc"
              cx="60" cy="60" r="46"
              stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/>
          </svg>
          <div class="gauge__center">
            <span class="gauge__value" id="disk-val">—</span>
            <span class="gauge__unit">%</span>
          </div>
        </div>
        <span class="gauge__label">Disque utilisé</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;justify-content:center;">
        <div class="net-stat">
          <span class="net-stat__label">📖 Lecture</span>
          <span class="net-stat__value" id="disk-read">—</span>
        </div>
        <div class="net-stat">
          <span class="net-stat__label">✏ Écriture</span>
          <span class="net-stat__value" id="disk-write">—</span>
        </div>
      </div>
    `;
    _init = true;
  }

  function update(data) {
    _setup();

    const disk = data.disk || {};
    const io   = data.throughput || {};
    const pct  = disk.percent || 0;
    const off  = CIRC - (CIRC * pct / 100);

    const arc = document.getElementById('disk-arc');
    const val = document.getElementById('disk-val');
    if (arc) {
      arc.style.strokeDashoffset = off;
      arc.className = 'gauge__arc gauge__arc--' + (pct > 85 ? 'red' : pct > 70 ? 'amber' : 'green');
    }
    if (val) val.textContent = pct.toFixed(1);

    const r = id => document.getElementById(id);
    if (r('disk-read'))  r('disk-read').textContent  = _fmt(io.read  || 0);
    if (r('disk-write')) r('disk-write').textContent = _fmt(io.write || 0);
  }

  return { update };
})();
