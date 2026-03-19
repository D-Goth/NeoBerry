/**
 * NeoBerry v2 — widgets/network.js
 * Upload / download bandwidth + interface list + internet status.
 */

const NetworkWidget = (() => {

  let _init = false;

  function _fmt(bytes) {
    if (bytes < 1024)    return `${bytes.toFixed(0)} B/s`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / 1048576).toFixed(2)} MB/s`;
  }

  function _setup() {
    if (_init) return;
    const body = document.getElementById('network-body');
    if (!body) return;
    body.innerHTML = `
      <div class="net-stat">
        <span class="net-stat__label">⬆ Upload</span>
        <span class="net-stat__value" id="net-up">—</span>
      </div>
      <div class="net-stat">
        <span class="net-stat__label">⬇ Download</span>
        <span class="net-stat__value" id="net-down">—</span>
      </div>
      <div class="iface-list" id="iface-list"></div>
    `;
    _init = true;
  }

  function update(data) {
    _setup();

    const bw = data.bandwidth || {};
    const up   = document.getElementById('net-up');
    const down = document.getElementById('net-down');
    if (up)   up.textContent   = _fmt(bw.upload   || 0);
    if (down) down.textContent = _fmt(bw.download || 0);

    // Internet badge in topbar
    App.updateNetBadge(data.internet);

    // Interface list
    const list = document.getElementById('iface-list');
    if (list && Array.isArray(data.interfaces)) {
      list.innerHTML = data.interfaces.map(iface => `
        <div class="iface-item">
          <div class="iface-dot ${iface.up ? 'iface-dot--up' : 'iface-dot--down'}"></div>
          <span class="iface-name">${iface.name}</span>
          <span class="iface-ip">${iface.ip || '—'}</span>
        </div>
      `).join('') || '<span class="muted" style="font-size:0.8rem">Aucune interface</span>';
    }
  }

  return { update };
})();
