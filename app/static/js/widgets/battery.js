/**
 * NeoBerry v2 — widgets/battery.js
 * Widget batterie : niveau %, icône, statut charge/décharge,
 * graphique tension en dégradé et stats voltage/courant/puissance.
 */

const BatteryWidget = (() => {

  let _chart    = null;
  let _chartCtx = null;
  let _ready    = false;

  // ── Setup DOM ──────────────────────────────────────────────────────────────

  function _setup() {
    if (_ready) return;
    const body = document.getElementById('battery-body');
    if (!body) return;

    body.innerHTML = `
      <div class="battery-main">
        <div class="battery-icon" id="bat-icon">
          <div class="battery-icon__body">
            <div class="battery-icon__fill" id="bat-fill" style="width:0%"></div>
          </div>
          <div class="battery-icon__tip"></div>
          <div class="battery-icon__bolt">⚡</div>
        </div>
        <div>
          <div class="battery-pct" id="bat-pct">—%</div>
          <div class="battery-status" id="bat-status">Détection…</div>
        </div>
        <div id="bat-source" style="margin-left:auto;font-size:.68rem;color:var(--txt-3);font-family:var(--mono)"></div>
      </div>

      <div class="voltage-graph">
        <canvas id="bat-chart"></canvas>
      </div>

      <div class="info-grid" id="bat-stats">
        <div class="info-item">
          <div class="info-item__key">Tension</div>
          <div class="info-item__val" id="bat-voltage">— V</div>
        </div>
        <div class="info-item">
          <div class="info-item__key">Courant</div>
          <div class="info-item__val" id="bat-current">— mA</div>
        </div>
        <div class="info-item">
          <div class="info-item__key">Puissance</div>
          <div class="info-item__val" id="bat-power">— W</div>
        </div>
        <div class="info-item">
          <div class="info-item__key">Secteur</div>
          <div class="info-item__val" id="bat-ac">—</div>
        </div>
      </div>
    `;

    // Init Chart.js pour graphique tension
    _chartCtx = document.getElementById('bat-chart');
    if (window.Chart && _chartCtx) {
      _chart = new window.Chart(_chartCtx.getContext('2d'), {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: '#FF1654',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            backgroundColor: (ctx) => {
              const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 52);
              g.addColorStop(0, 'rgba(255,22,84,.35)');
              g.addColorStop(1, 'rgba(255,22,84,.0)');
              return g;
            },
            tension: 0.4,
          }],
        },
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false },
            y: {
              display: true,
              position: 'right',
              ticks: { color: '#555', font: { family: 'JetBrains Mono', size: 9 }, maxTicksLimit: 3 },
              grid: { color: 'rgba(255,255,255,.04)', drawBorder: false },
            },
          },
        },
      });
    }

    _ready = true;
  }

  // ── Couleur selon % batterie ───────────────────────────────────────────────

  function _battColor(pct) {
    if (pct > 50) return '#00e887';
    if (pct > 25) return '#ff8c00';
    return '#ff4444';
  }

  // ── Labels statut ─────────────────────────────────────────────────────────

  const STATUS_LABELS = {
    charge:      '⚡ En charge',
    decharge:    '🔋 Décharge',
    plein:       '✓ Plein',
    pas_charge:  '— En attente',
    inconnu:     '? Inconnu',
    simulation:  '⚠ Simulation',
    poe_actif:   '⚡ PoE actif',
    mesure:      '📡 INA219',
  };

  // ── Update ────────────────────────────────────────────────────────────────

  function update(data) {
    _setup();

    const pct     = data.percent ?? null;
    const voltage = data.voltage ?? null;
    const status  = data.status  ?? 'inconnu';
    const charging = !!data.charging;
    const available = !!data.available;

    // Icône batterie
    const icon = document.getElementById('bat-icon');
    const fill = document.getElementById('bat-fill');
    if (icon) icon.classList.toggle('charging', charging);
    if (fill && pct != null) {
      fill.style.width    = `${Math.max(3, pct)}%`;
      fill.style.background = charging ? '#FF1654' : _battColor(pct);
    }

    // Pourcentage
    const pctEl = document.getElementById('bat-pct');
    if (pctEl) pctEl.textContent = pct != null ? `${pct}%` : '—%';

    // Statut
    const statusEl = document.getElementById('bat-status');
    if (statusEl) {
      statusEl.textContent = STATUS_LABELS[status] || status;
      statusEl.style.color = charging ? '#FF1654' : (pct < 20 ? '#ff4444' : 'var(--txt-2)');
    }

    // Source
    const srcEl = document.getElementById('bat-source');
    if (srcEl) srcEl.textContent = data.source || '';

    // Stats
    const r = id => document.getElementById(id);
    if (r('bat-voltage')) r('bat-voltage').textContent = voltage != null ? `${voltage} V`        : '— V';
    if (r('bat-current')) r('bat-current').textContent = data.current_ma != null ? `${data.current_ma} mA` : '— mA';
    if (r('bat-power'))   r('bat-power').textContent   = data.power_w    != null ? `${data.power_w} W`    : '— W';
    if (r('bat-ac'))      r('bat-ac').textContent      = data.ac_online  == null ? '—'
                                                        : data.ac_online ? '✓ Connecté' : '✗ Déconnecté';

    // Graphique tension
    if (_chart && data.history && data.history.length > 1) {
      const h = data.history;
      _chart.data.labels   = h.map(() => '');
      _chart.data.datasets[0].data = h.map(p => p.v);
      _chart.update('none');
    }

    // Pas de batterie → message
    if (!available && status !== 'simulation') {
      if (statusEl) statusEl.textContent = 'Aucune batterie détectée';
    }
  }

  // ── Snapshot initial ──────────────────────────────────────────────────────

  function applySnapshot(data) { update(data); }

  return { update, applySnapshot };
})();
