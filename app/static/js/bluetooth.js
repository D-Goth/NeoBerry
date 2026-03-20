/**
 * NeoBerry v2 — bluetooth.js
 * Bluetooth modal: power toggle, scan, pair, connect/disconnect, send data.
 */

const BT = (() => {

  let _scanning       = false;
  let _paired         = [];          // array of device dicts
  let _discovered     = [];          // devices found during scan
  let _selectedTarget = null;        // selected device for data send

  // ── Icons by device class / icon hint ─────────────────────────────────────

  const ICONS = {
    'audio-headphones': '🎧',
    'audio-speakers':   '🔊',
    'audio-headset':    '🎤',
    'input-mouse':      '🖱',
    'input-keyboard':   '⌨',
    'input-gaming':     '🎮',
    'phone':            '📱',
    'computer':         '💻',
    'default':          '📡',
  };

  function _icon(dev) {
    return ICONS[dev.icon] || ICONS.default;
  }

  function _rssiBar(rssi) {
    if (!rssi || rssi <= -100) return '▁▁▁';
    if (rssi >= -50) return '▇▇▇';
    if (rssi >= -70) return '▇▇▁';
    return '▇▁▁';
  }

  // ── Power ─────────────────────────────────────────────────────────────────

  async function setPower(on) {
    _setStatus(on ? 'Activation…' : 'Désactivation…');
    try {
      const r = await App.api('/api/bluetooth/power', 'POST', { on });
      _setStatus(r.ok ? (on ? 'Bluetooth activé' : 'Bluetooth désactivé') : (r.error || 'Erreur'));
    } catch {
      _setStatus('Erreur réseau');
    }
  }

  // ── Scan ──────────────────────────────────────────────────────────────────

  async function toggleScan() {
    if (_scanning) {
      await stopScan();
    } else {
      await startScan();
    }
  }

  async function startScan() {
    _discovered = [];
    _renderDiscovered();
    _scanning = true;
    _updateScanBtn();
    _setStatus('Scan en cours…');

    try {
      const r = await App.api('/api/bluetooth/scan/start', 'POST');
      if (!r.ok) {
        _scanning = false;
        _updateScanBtn();
        _setStatus(r.error || 'Erreur au démarrage du scan');
      }
    } catch {
      _scanning = false;
      _updateScanBtn();
      _setStatus('Erreur réseau');
    }
  }

  async function stopScan() {
    try {
      await App.api('/api/bluetooth/scan/stop', 'POST');
    } catch {}
    _scanning = false;
    _updateScanBtn();
    _setStatus(`Scan terminé — ${_discovered.length} appareil(s) trouvé(s)`);
  }

  // Called by WS event 'bt_device_found'
  function onDeviceFound(dev) {
    const exists = _discovered.find(d => d.address === dev.address);
    if (!exists) {
      _discovered.push(dev);
      _renderDiscovered();
    }
  }

  function _updateScanBtn() {
    const btn = document.getElementById('bt-scan-btn');
    if (!btn) return;
    if (_scanning) {
      btn.innerHTML = '<span class="bt-scan-ring"></span> Arrêter';
    } else {
      btn.textContent = 'Démarrer le scan';
    }
  }

  // ── Pair ──────────────────────────────────────────────────────────────────

  async function pair(address) {
    _setStatus(`Jumelage de ${address}…`);
    try {
      const r = await App.api(`/api/bluetooth/pair/${address}`, 'POST');
      if (r.ok) {
        _setStatus('Jumelage réussi ✓');
        App.showToast('Jumelage réussi', 'green');
        await loadPaired();
      } else {
        _setStatus(r.error || 'Jumelage échoué');
        App.showToast(r.error || 'Jumelage échoué', 'red');
      }
    } catch {
      _setStatus('Erreur réseau');
    }
  }

  // ── Connect / disconnect ───────────────────────────────────────────────────

  async function connect(address) {
    _setStatus(`Connexion à ${address}…`);
    try {
      const r = await App.api(`/api/bluetooth/connect/${address}`, 'POST');
      if (r.ok) {
        _setStatus('Connecté ✓');
        App.showToast('Connecté', 'green');
      } else {
        _setStatus(r.error || 'Connexion échouée');
      }
    } catch {
      _setStatus('Erreur réseau');
    }
  }

  async function disconnect(address) {
    _setStatus(`Déconnexion de ${address}…`);
    try {
      const r = await App.api(`/api/bluetooth/disconnect/${address}`, 'POST');
      _setStatus(r.ok ? 'Déconnecté' : (r.error || 'Erreur'));
    } catch {
      _setStatus('Erreur réseau');
    }
  }

  // Called by WS event 'bt_connection_change'
  function onConnectionChange({ address, connected }) {
    const dev = _paired.find(d => d.address === address);
    if (dev) {
      dev.connected = connected;
      _renderPaired();
    }
    if (!connected && _selectedTarget === address) {
      _selectedTarget = null;
      const lbl = document.getElementById('bt-send-target');
      if (lbl) lbl.textContent = 'Sélectionnez un appareil connecté';
    }
  }

  // ── Remove ─────────────────────────────────────────────────────────────────

  async function remove(address) {
    if (!confirm('Supprimer ce jumelage ?')) return;
    try {
      const r = await App.api(`/api/bluetooth/remove/${address}`, 'POST');
      if (r.ok) {
        _setStatus('Appareil supprimé');
        await loadPaired();
      } else {
        _setStatus(r.error || 'Erreur');
      }
    } catch {
      _setStatus('Erreur réseau');
    }
  }

  // ── Send data ──────────────────────────────────────────────────────────────

  async function sendData() {
    if (!_selectedTarget) {
      App.showToast('Sélectionnez un appareil connecté', 'red');
      return;
    }
    const input = document.getElementById('bt-send-input');
    const msg   = (input?.value || '').trim();
    if (!msg) return;

    try {
      const r = await App.api('/api/bluetooth/send', 'POST', {
        address: _selectedTarget,
        message: msg,
      });
      _logSend(r.ok
        ? `✓ Envoyé à ${_selectedTarget} (${r.bytes_sent} octets)`
        : `✗ Erreur : ${r.error}`);
      if (r.ok && input) input.value = '';
    } catch {
      _logSend('✗ Erreur réseau');
    }
  }

  function _logSend(msg) {
    const log = document.getElementById('bt-send-log');
    if (!log) return;
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  // ── Load paired list ───────────────────────────────────────────────────────

  async function loadPaired() {
    try {
      const r = await App.api('/api/bluetooth/devices', 'GET');
      _paired = r.devices || [];
      _renderPaired();
    } catch {
      _setStatus('Impossible de charger les appareils');
    }
  }

  // ── Snapshot from WS ──────────────────────────────────────────────────────

  function applySnapshot(data) {
    const toggle = document.getElementById('bt-power-toggle');
    if (toggle) toggle.checked = data.power;

    _paired   = data.paired || [];
    _scanning = data.scanning || false;

    _renderPaired();
    _updateScanBtn();
  }

  // ── Render: discovered devices ─────────────────────────────────────────────

  function _renderDiscovered() {
    const list = document.getElementById('bt-discovered-list');
    if (!list) return;

    if (!_discovered.length) {
      list.innerHTML = '<span class="muted" style="font-size:0.8rem">Aucun appareil détecté</span>';
      return;
    }

    list.innerHTML = _discovered.map(dev => `
      <div class="bt-device" data-addr="${dev.address}">
        <div class="bt-device__icon">${_icon(dev)}</div>
        <div class="bt-device__info">
          <div class="bt-device__name">${_esc(dev.name)}</div>
          <div class="bt-device__addr">${dev.address} <span style="color:var(--clr-cyan)">${_rssiBar(dev.rssi)}</span></div>
        </div>
        <div class="bt-device__actions">
          ${dev.paired
            ? `<button class="bt-action bt-action--green" onclick="BT.connect('${dev.address}')">Connecter</button>`
            : `<button class="bt-action bt-action--cyan"  onclick="BT.pair('${dev.address}')">Jumeler</button>`
          }
        </div>
      </div>
    `).join('');
  }

  // ── Render: paired devices ─────────────────────────────────────────────────

  function _renderPaired() {
    const list = document.getElementById('bt-paired-list');
    if (!list) return;

    if (!_paired.length) {
      list.innerHTML = '<span class="muted" style="font-size:0.8rem">Aucun appareil jumelé</span>';
      return;
    }

    list.innerHTML = _paired.map(dev => `
      <div class="bt-device ${dev.connected ? 'connected' : ''}" data-addr="${dev.address}">
        <div class="bt-device__icon">${_icon(dev)}</div>
        <div class="bt-device__info">
          <div class="bt-device__name">${_esc(dev.name)}</div>
          <div class="bt-device__addr">
            ${dev.address}
            ${dev.connected
              ? '<span class="text-green" style="margin-left:6px;font-size:0.7rem">● Connecté</span>'
              : '<span class="muted"      style="margin-left:6px;font-size:0.7rem">○ Déconnecté</span>'}
          </div>
        </div>
        <div class="bt-device__actions">
          ${dev.connected
            ? `<button class="bt-action bt-action--cyan" onclick="BT.selectForSend('${dev.address}','${_esc(dev.name)}')">Données</button>
               <button class="bt-action bt-action--red"  onclick="BT.disconnect('${dev.address}')">Déconnecter</button>`
            : `<button class="bt-action bt-action--green" onclick="BT.connect('${dev.address}')">Connecter</button>`
          }
          <button class="bt-action bt-action--red" onclick="BT.remove('${dev.address}')" title="Supprimer le jumelage">✕</button>
        </div>
      </div>
    `).join('');
  }

  // ── Select device for data send ───────────────────────────────────────────

  function selectForSend(address, name) {
    _selectedTarget = address;
    const lbl = document.getElementById('bt-send-target');
    if (lbl) lbl.textContent = `Cible : ${name} (${address})`;
    // Scroll to send area
    document.getElementById('bt-send-input')?.focus();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _setStatus(msg) {
    const el = document.getElementById('bt-status-text');
    if (el) el.textContent = msg;
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    setPower, toggleScan, startScan, stopScan,
    pair, connect, disconnect, remove,
    sendData, loadPaired, selectForSend,
    applySnapshot, onDeviceFound, onConnectionChange,
  };
})();
