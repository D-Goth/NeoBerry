/**
 * NeoBerry v2 — app.js
 * Core app: WebSocket connection, clock, system actions, global state.
 */

const App = (() => {

  // ── State ──────────────────────────────────────────────────────────────────

  let _socket = null;

  // ── WebSocket ──────────────────────────────────────────────────────────────

  function initSocket() {
    _socket = io({ transports: ['websocket'], reconnectionDelay: 1000 });

    _socket.on('connect', () => {
      _setBadge('ws-badge', 'ws-label', 'WebSocket', 'topbar__badge--online');
    });

    _socket.on('disconnect', () => {
      _setBadge('ws-badge', 'ws-label', 'Déconnecté', 'topbar__badge--offline', true);
    });

    _socket.on('connect_error', () => {
      _setBadge('ws-badge', 'ws-label', 'Erreur WS', 'topbar__badge--offline', true);
    });

    // Initial full snapshot
    _socket.on('system_snapshot', (data) => {
      if (data.gpio)    GPIO.applySnapshot(data.gpio);
      if (data.system)  SystemWidget.update(data.system);
      if (data.network) NetworkWidget.update(data.network);
      if (data.storage) StorageWidget.update(data.storage);
      if (data.bt)      BT.applySnapshot(data.bt);
    });

    // Live metrics push every 2s
    _socket.on('metrics', (data) => {
      if (data.system)  SystemWidget.update(data.system);
      if (data.network) NetworkWidget.update(data.network);
      if (data.storage) StorageWidget.update(data.storage);
    });

    // GPIO state change (broadcast)
    _socket.on('gpio_state', ({ pin, state }) => {
      GPIO.applyPinState(pin, state);
    });

    // Bluetooth events
    _socket.on('bt_device_found',      BT.onDeviceFound.bind(BT));
    _socket.on('bt_connection_change', BT.onConnectionChange.bind(BT));
  }

  function getSocket() { return _socket; }

  // ── Clock ──────────────────────────────────────────────────────────────────

  function initClock() {
    const el = document.getElementById('topbar-time');
    function tick() {
      const now = new Date();
      el.textContent = now.toLocaleTimeString('fr-FR', { hour12: false });
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── System actions ─────────────────────────────────────────────────────────

  async function sysAction(action) {
    const labels = {
      reboot:   'Rebooter le Raspberry Pi ?',
      shutdown: 'Éteindre le Raspberry Pi ?',
    };
    if (!confirm(labels[action] || `Action : ${action} ?`)) return;

    try {
      const r = await fetch(`/api/system/${action}`, { method: 'POST' });
      const d = await r.json();
      if (d.ok) showToast(d.message || 'OK', 'green');
      else       showToast(d.error  || 'Erreur', 'red');
    } catch {
      showToast('Erreur réseau', 'red');
    }
  }

  // ── Layout persistence ─────────────────────────────────────────────────────

  function resetLayout() {
    localStorage.removeItem('neoberry_layout');
    location.reload();
  }

  // ── Toast notification ─────────────────────────────────────────────────────

  function showToast(msg, color = 'cyan') {
    const colors = {
      cyan:  'rgba(0 212 255 / 0.9)',
      green: 'rgba(0 232 135 / 0.9)',
      red:   'rgba(255 77 77 / 0.9)',
    };
    const t = document.createElement('div');
    Object.assign(t.style, {
      position: 'fixed', bottom: '20px', right: '20px', zIndex: '999',
      padding: '10px 18px', borderRadius: '8px',
      background: colors[color] || colors.cyan,
      color: '#000', fontWeight: '600', fontSize: '0.85rem',
      boxShadow: '0 4px 20px rgba(0 0 0 / 0.4)',
      animation: 'fade-in 0.2s ease',
      fontFamily: 'var(--font-mono)',
    });
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ── Net badge ──────────────────────────────────────────────────────────────

  function updateNetBadge(online) {
    const el  = document.getElementById('net-badge');
    const lbl = document.getElementById('net-label');
    if (!el || !lbl) return;
    lbl.textContent = online ? 'En ligne' : 'Hors ligne';
    el.className = 'topbar__badge ' + (online ? 'topbar__badge--online' : 'topbar__badge--offline');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _setBadge(badgeId, labelId, text, cls, reset = false) {
    const badge = document.getElementById(badgeId);
    const label = document.getElementById(labelId);
    if (!badge || !label) return;
    label.textContent = text;
    badge.className   = `topbar__badge ${reset ? '' : cls}`;
    if (!reset) badge.classList.add(cls);
  }

  // ── API helper ─────────────────────────────────────────────────────────────

  async function api(url, method = 'POST', body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    return r.json();
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    initClock();
    initSocket();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { sysAction, resetLayout, showToast, updateNetBadge, api, getSocket };
})();

// ── Modal helpers (global scope for onclick) ──────────────────────────────────

function openBluetooth() {
  document.getElementById('bt-modal-overlay').classList.add('open');
  BT.loadPaired();
}

function closeBluetooth(e) {
  if (!e || e.target === document.getElementById('bt-modal-overlay')) {
    document.getElementById('bt-modal-overlay').classList.remove('open');
  }
}
