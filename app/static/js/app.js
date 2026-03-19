/**
 * NeoBerry v2 — app.js
 * WebSocket, horloge semaine, actions système, toasts.
 */

const App = (() => {

  let _socket = null;

  // ── WebSocket ──────────────────────────────────────────────────────────────

  function initSocket() {
    _socket = io({ transports: ['websocket'], reconnectionDelay: 1000 });

    _socket.on('connect', () => {
      _setBadge('ws-badge', 'ws-label', 'En ligne', true);
    });
    _socket.on('disconnect', () => {
      _setBadge('ws-badge', 'ws-label', 'Déconnecté', false);
    });
    _socket.on('connect_error', () => {
      _setBadge('ws-badge', 'ws-label', 'Erreur WS', false);
    });

    _socket.on('system_snapshot', (data) => {
      if (data.gpio)    GPIO.applySnapshot(data.gpio);
      if (data.system)  SystemWidget.update(data.system);
      if (data.network) NetworkWidget.update(data.network);
      if (data.storage) StorageWidget.update(data.storage);
      if (data.battery) BatteryWidget.applySnapshot(data.battery);
      if (data.bt)      BT.applySnapshot(data.bt);
    });

    _socket.on('metrics', (data) => {
      if (data.system)  SystemWidget.update(data.system);
      if (data.network) NetworkWidget.update(data.network);
      if (data.storage) StorageWidget.update(data.storage);
      if (data.battery) BatteryWidget.update(data.battery);
    });

    _socket.on('gpio_state',          ({ pin, state }) => GPIO.applyPinState(pin, state));
    _socket.on('bt_device_found',      BT.onDeviceFound.bind(BT));
    _socket.on('bt_connection_change', BT.onConnectionChange.bind(BT));
  }

  function getSocket() { return _socket; }

  // ── Horloge avec jour de semaine ───────────────────────────────────────────

  const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const JOURS_COURTS = ['Di','Lu','Ma','Me','Je','Ve','Sa'];
  const MOIS = ['janvier','février','mars','avril','mai','juin',
                'juillet','août','septembre','octobre','novembre','décembre'];

  function initClock() {
    // Topbar clock (compact)
    const timeEl = document.getElementById('topbar-time');
    const dateEl = document.getElementById('topbar-date');

    // Widget clock (full)
    const clockTime = document.getElementById('clock-time');
    const clockDate = document.getElementById('clock-date');
    const clockWeek = document.getElementById('clock-week');
    const clockDays = document.getElementById('clock-days');

    function tick() {
      const now   = new Date();
      const h     = String(now.getHours()).padStart(2,'0');
      const m     = String(now.getMinutes()).padStart(2,'0');
      const s     = String(now.getSeconds()).padStart(2,'0');
      const jour  = now.getDay();
      const date  = now.getDate();
      const mois  = MOIS[now.getMonth()];
      const annee = now.getFullYear();

      // Semaine ISO
      const d   = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

      // Topbar
      if (timeEl) timeEl.textContent = `${h}:${m}:${s}`;
      if (dateEl) dateEl.textContent = `${JOURS[jour].slice(0,3)} ${date} ${mois.slice(0,3)}.`;

      // Widget horloge
      if (clockTime) {
        clockTime.innerHTML = `${h}<span>:</span>${m}<span style="font-size:1.4rem;color:var(--txt-2)">:${s}</span>`;
      }
      if (clockDate) clockDate.textContent = `${JOURS[jour]} ${date} ${mois} ${annee}`;
      if (clockWeek) clockWeek.textContent = `Semaine ${weekNum}`;
      if (clockDays) {
        clockDays.innerHTML = JOURS_COURTS.map((j, i) =>
          `<div class="clock-day ${i === jour ? 'today' : ''}">${j}</div>`
        ).join('');
      }
    }

    tick();
    setInterval(tick, 1000);
  }

  // ── Actions système ────────────────────────────────────────────────────────

  async function sysAction(action) {
    const labels = { reboot: 'Rebooter le Raspberry Pi ?', shutdown: 'Éteindre le Raspberry Pi ?' };
    if (!confirm(labels[action] || `Action : ${action} ?`)) return;
    try {
      const r = await fetch(`/api/system/${action}`, { method: 'POST' });
      const d = await r.json();
      showToast(d.ok ? (d.message || 'OK') : (d.error || 'Erreur'), d.ok ? 'green' : 'red');
    } catch { showToast('Erreur réseau', 'red'); }
  }

  function resetLayout() {
    localStorage.removeItem('neoberry_layout');
    location.reload();
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  function showToast(msg, type = 'red') {
    const colors = {
      red:   'var(--nb-red)',
      green: 'var(--pin-on)',
      amber: '#ff8c00',
    };
    const t = document.createElement('div');
    Object.assign(t.style, {
      position: 'fixed', bottom: '20px', right: '20px', zIndex: '999',
      padding: '9px 16px', borderRadius: '8px',
      background: colors[type] || colors.red,
      color: type === 'red' ? '#fff' : '#000',
      fontWeight: '700', fontSize: '.82rem',
      boxShadow: '0 4px 20px rgba(0,0,0,.5)',
      animation: 'fade-in .2s ease',
      fontFamily: 'var(--mono)',
    });
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ── Net badge ─────────────────────────────────────────────────────────────

  function updateNetBadge(online) {
    const el  = document.getElementById('net-badge');
    const lbl = document.getElementById('net-label');
    if (!el || !lbl) return;
    lbl.textContent = online ? 'En ligne' : 'Hors ligne';
    el.className = 'topbar__badge ' + (online ? 'topbar__badge--on' : 'topbar__badge--off');
  }

  // ── API helper ─────────────────────────────────────────────────────────────

  async function api(url, method = 'POST', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    return r.json();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _setBadge(badgeId, labelId, text, online) {
    const badge = document.getElementById(badgeId);
    const label = document.getElementById(labelId);
    if (!badge || !label) return;
    label.textContent = text;
    badge.className   = `topbar__badge topbar__badge--${online ? 'on' : 'off'}`;
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initSocket();
  });

  return { sysAction, resetLayout, showToast, updateNetBadge, api, getSocket };
})();

function openBluetooth()    { document.getElementById('bt-modal-overlay').classList.add('open'); BT.loadPaired(); }
function closeBluetooth(e)  { if (!e || e.target === document.getElementById('bt-modal-overlay')) document.getElementById('bt-modal-overlay').classList.remove('open'); }
