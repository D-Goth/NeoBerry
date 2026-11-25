/**
 * NeoBerry v2 — widgets/battery.js
 * Deux affichages selon data.mode :
 *   - "mains"                 : Pi sur secteur, statut via get_throttled + frise 1 h
 *   - "battery" / "simulation" : niveau %, icône, courbe tension, stats
 */

const BatteryWidget = (() => {

  let _chart = null;
  let _mode  = null;

  const STATUS_COLORS = { ok: '#00e887', warn: '#ff8c00', bad: '#ff4444' };

  const BAT_LABELS = {
    charge:     '⚡ En charge',
    decharge:   '🔋 Décharge',
    plein:      '✓ Plein',
    pas_charge: '— En attente',
    inconnu:    '? Inconnu',
    simulation: '⚠ Simulation',
    poe_actif:  '⚡ PoE actif',
    mesure:     '📡 INA219',
  };

  const $ = id => document.getElementById(id);

  // ── Layout secteur ────────────────────────────────────────────────────────

  function _buildMains(body) {
    body.innerHTML = `
      <div class="battery-main">
        <div class="pwr-plug" id="pwr-plug">⚡</div>
        <div>
          <div class="battery-pct">Secteur</div>
          <div class="battery-status" id="pwr-label">Lecture…</div>
        </div>
        <div class="pwr-raw" id="pwr-raw"></div>
      </div>

      <div class="pwr-timeline" id="pwr-timeline"></div>
      <div class="pwr-timeline-legend">
        <span>−1 h</span><span>Stabilité électrique</span><span>maintenant</span>
      </div>

      <div class="info-grid pwr-grid">
        <div class="info-item">
          <div class="info-item__key">Tension cœur (SoC)</div>
          <div class="info-item__val" id="pwr-core">—</div>
        </div>
        <div class="info-item">
          <div class="info-item__key">Sous-tension (boot)</div>
          <div class="info-item__val" id="pwr-boot">—</div>
        </div>
        <div class="info-item">
          <div class="info-item__key">Alertes (session)</div>
          <div class="info-item__val" id="pwr-count">0</div>
        </div>
        <div class="info-item">
          <div class="info-item__key">Dernière alerte</div>
          <div class="info-item__val" id="pwr-last">Aucune</div>
        </div>
      </div>
    `;
  }

  function _updateMains(data) {
    const p   = data.power || {};
    const thr = p.throttled || {};
    const color = STATUS_COLORS[thr.status] || 'var(--txt-3)';

    const plug = $('pwr-plug');
    if (plug) {
      plug.style.color       = color;
      plug.style.borderColor = color;
      plug.classList.toggle('alert', thr.status === 'bad');
    }

    const lbl = $('pwr-label');
    if (lbl) {
      lbl.textContent = thr.available ? thr.label : 'Statut indisponible';
      lbl.style.color = color;
    }
    if ($('pwr-raw'))  $('pwr-raw').textContent  = thr.raw || '';
    if ($('pwr-core')) $('pwr-core').textContent = p.core_voltage != null ? `${p.core_voltage} V` : '—';
    if ($('pwr-boot')) {
      $('pwr-boot').textContent = thr.under_boot ? 'Oui' : 'Non';
      $('pwr-boot').style.color = thr.under_boot ? STATUS_COLORS.warn : STATUS_COLORS.ok;
    }
    if ($('pwr-count')) $('pwr-count').textContent = p.event_count ?? 0;
    if ($('pwr-last')) {
      const ev = p.events || [];
      $('pwr-last').textContent = ev.length
        ? new Date(ev[ev.length - 1] * 1000).toLocaleTimeString('fr-FR')
        : 'Aucune';
    }

    _renderTimeline(p.timeline || [], p.sample_every || 30);
  }

  function _renderTimeline(points, step) {
    const el = $('pwr-timeline');
    if (!el) return;
    const SLOTS = 120;
    const pad   = Math.max(0, SLOTS - points.length);
    const cells = [];
    for (let i = 0; i < pad; i++) cells.push('<span class="pwr-cell"></span>');
    points.forEach((st, i) => {
      const ago = Math.round((points.length - 1 - i) * step / 60);
      const tip = ago === 0 ? 'maintenant' : `il y a ${ago} min`;
      cells.push(`<span class="pwr-cell pwr-cell--${st}" title="${tip}"></span>`);
    });
    el.innerHTML = cells.join('');
  }

  // ── Layout batterie ───────────────────────────────────────────────────────

  function _buildBattery(body) {
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
        <div class="pwr-raw" id="bat-source"></div>
      </div>

      <div class="voltage-graph"><canvas id="bat-chart"></canvas></div>

      <div class="info-grid">
        <div class="info-item">
          <div class="info-item__key">Tension batterie</div>
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
          <div class="info-item__key">Alimentation Pi</div>
          <div class="info-item__val" id="bat-pwr">—</div>
        </div>
      </div>
    `;

    const canvas = $('bat-chart');
    _chart = null;
    if (window.Chart && canvas) {
      _chart = new window.Chart(canvas.getContext('2d'), {
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
  }

  function _battColor(pct) {
    if (pct > 50) return STATUS_COLORS.ok;
    if (pct > 25) return STATUS_COLORS.warn;
    return STATUS_COLORS.bad;
  }

  function _updateBattery(data) {
    const pct      = data.percent ?? null;
    const status   = data.status  ?? 'inconnu';
    const charging = !!data.charging;

    const icon = $('bat-icon');
    const fill = $('bat-fill');
    if (icon) icon.classList.toggle('charging', charging);
    if (fill && pct != null) {
      fill.style.width      = `${Math.max(3, pct)}%`;
      fill.style.background = charging ? '#FF1654' : _battColor(pct);
    }

    if ($('bat-pct')) $('bat-pct').textContent = pct != null ? `${pct}%` : '—%';

    const st = $('bat-status');
    if (st) {
      st.textContent = BAT_LABELS[status] || status;
      st.style.color = charging ? '#FF1654' : (pct != null && pct < 20 ? STATUS_COLORS.bad : 'var(--txt-2)');
    }

    if ($('bat-source'))  $('bat-source').textContent  = data.source || '';
    if ($('bat-voltage')) $('bat-voltage').textContent = data.voltage    != null ? `${data.voltage} V`    : '— V';
    if ($('bat-current')) $('bat-current').textContent = data.current_ma != null ? `${data.current_ma} mA` : '— mA';
    if ($('bat-power'))   $('bat-power').textContent   = data.power_w    != null ? `${data.power_w} W`    : '— W';

    const thr = (data.power || {}).throttled || {};
    const pwr = $('bat-pwr');
    if (pwr) {
      pwr.textContent = thr.available ? thr.label : (data.ac_online ? '✓ Secteur' : '—');
      pwr.style.color = STATUS_COLORS[thr.status] || 'var(--txt)';
    }

    if (_chart && data.history && data.history.length > 1) {
      _chart.data.labels           = data.history.map(() => '');
      _chart.data.datasets[0].data = data.history.map(p => p.v);
      _chart.update('none');
    }
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────

  function update(data) {
    const body = $('battery-body');
    if (!body || !data) return;

    const mode = data.mode === 'mains' ? 'mains' : 'battery';
    if (mode !== _mode) {
      _mode = mode;
      mode === 'mains' ? _buildMains(body) : _buildBattery(body);
      const title = body.closest('.widget')?.querySelector('.widget__title');
      if (title) title.textContent = mode === 'mains' ? 'Alimentation' : 'Alimentation / Batterie';
    }

    mode === 'mains' ? _updateMains(data) : _updateBattery(data);
  }

  function applySnapshot(data) { update(data); }

  return { update, applySnapshot };
})();
