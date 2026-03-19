/**
 * NeoBerry v2 — widgets/gpio.js
 * GPIO pin buttons, state management, click-to-toggle.
 */

const GPIO = (() => {

  const PINS = [
    2,3,4,5,6,7,8,9,10,11,
    12,13,14,15,16,17,18,19,20,21,
    22,23,24,25,26,27,
  ];

  let _state = {};   // pin → { state: bool, mode: string }
  let _rendered = false;

  // ── Render grid ────────────────────────────────────────────────────────────

  function _render(simulation = false) {
    const grid = document.getElementById('gpio-grid');
    if (!grid) return;

    grid.innerHTML = '';

    PINS.forEach(pin => {
      const info = _state[pin] || { state: false, mode: 'output' };
      const btn  = document.createElement('button');
      btn.className = `pin-btn${info.state ? ' active' : ''}${info.mode === 'input' ? ' input-mode' : ''}`;
      btn.dataset.pin = pin;
      btn.title = `GPIO ${pin} — ${info.mode}`;

      btn.innerHTML = `
        <div class="pin-btn__dot"></div>
        <span class="pin-btn__num">${pin}</span>
      `;

      if (info.mode !== 'input') {
        btn.addEventListener('click', () => _toggle(pin));
      }

      // Right-click → toggle input/output
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const newMode = info.mode === 'input' ? 'output' : 'input';
        _setMode(pin, newMode);
      });

      grid.appendChild(btn);
    });

    _rendered = true;

    // Sim badge
    const badge = document.getElementById('gpio-sim-badge');
    if (badge) badge.style.display = simulation ? 'inline-flex' : 'none';
  }

  // ── Toggle pin ─────────────────────────────────────────────────────────────

  async function _toggle(pin) {
    const current = (_state[pin] || {}).state || false;
    const newState = !current;

    // Optimistic UI
    applyPinState(pin, newState);

    try {
      const r = await App.api(`/api/gpio/${pin}`, 'POST', { state: newState });
      if (!r.ok) applyPinState(pin, current);   // rollback
    } catch {
      applyPinState(pin, current);
    }
  }

  // ── Set mode ───────────────────────────────────────────────────────────────

  async function _setMode(pin, mode) {
    try {
      await App.api(`/api/gpio/${pin}/mode`, 'POST', { mode });
      if (!_state[pin]) _state[pin] = { state: false, mode };
      else _state[pin].mode = mode;
      _updateBtn(pin);
    } catch (e) {
      console.error('GPIO mode error:', e);
    }
  }

  // ── Apply state (from WS broadcast) ───────────────────────────────────────

  function applyPinState(pin, state) {
    if (!_state[pin]) _state[pin] = { state: false, mode: 'output' };
    _state[pin].state = state;
    _updateBtn(pin);
  }

  function _updateBtn(pin) {
    const btn = document.querySelector(`.pin-btn[data-pin="${pin}"]`);
    if (!btn) return;
    const info = _state[pin] || { state: false, mode: 'output' };
    btn.classList.toggle('active', info.state);
    btn.classList.toggle('input-mode', info.mode === 'input');
    btn.title = `GPIO ${pin} — ${info.mode}`;
  }

  // ── Snapshot ───────────────────────────────────────────────────────────────

  function applySnapshot(data) {
    const simulation = data.simulation || false;
    const pins = data.pins || {};

    // Normalize
    _state = {};
    for (const [pinStr, info] of Object.entries(pins)) {
      _state[parseInt(pinStr)] = info;
    }

    if (!_rendered) {
      _render(simulation);
    } else {
      PINS.forEach(p => _updateBtn(p));
      const badge = document.getElementById('gpio-sim-badge');
      if (badge) badge.style.display = simulation ? 'inline-flex' : 'none';
    }
  }

  return { applySnapshot, applyPinState };
})();
