/**
 * NeoBerry v2 — widgets/info.js
 * System information: OS, hostname, architecture, uptime, last update.
 * Loaded once on DOMContentLoaded via REST (doesn't need real-time updates).
 */

const InfoWidget = (() => {

  let _loaded = false;

  async function load() {
    if (_loaded) return;
    const body = document.getElementById('info-body');
    if (!body) return;

    // Skeleton while loading
    body.innerHTML = `
      <div class="info-grid">
        ${Array(5).fill('<div class="info-item"><div class="skeleton" style="height:32px"></div></div>').join('')}
      </div>`;

    try {
      const data = await App.api('/api/system/info', 'GET');
      const os   = data.os || {};

      body.innerHTML = `
        <div class="info-grid">
          <div class="info-item">
            <div class="info-item__key">Système</div>
            <div class="info-item__val">${_esc(os.os || '—')}</div>
          </div>
          <div class="info-item">
            <div class="info-item__key">Hôte</div>
            <div class="info-item__val">${_esc(os.hostname || '—')}</div>
          </div>
          <div class="info-item">
            <div class="info-item__key">Uptime</div>
            <div class="info-item__val" id="info-uptime">${_esc(data.uptime || '—')}</div>
          </div>
          <div class="info-item">
            <div class="info-item__key">Architecture</div>
            <div class="info-item__val">${_esc(os.architecture || '—')}</div>
          </div>
          <div class="info-item" style="grid-column: span 2">
            <div class="info-item__key">Dernière MAJ</div>
            <div class="info-item__val">${_esc(os.last_update || '—')}</div>
          </div>
        </div>
      `;
      _loaded = true;

      // Refresh uptime every 60s without full reload
      setInterval(() => _refreshUptime(), 60_000);

    } catch {
      body.innerHTML = '<span class="muted" style="padding:8px;font-size:0.8rem">Impossible de charger les infos système</span>';
    }
  }

  async function _refreshUptime() {
    try {
      const data = await App.api('/api/system/info', 'GET');
      const el   = document.getElementById('info-uptime');
      if (el && data.uptime) el.textContent = data.uptime;
    } catch {}
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(load, 600));

  return { load };
})();
