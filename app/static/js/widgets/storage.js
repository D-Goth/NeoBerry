/**
 * NeoBerry v2 — widgets/storage.js
 * 3 jauges doughnut (v1-style) : capacité, lecture, écriture + débit texte.
 */

const StorageWidget = (() => {

  function _fmt(bytes) {
    if (bytes < 1024)    return `${bytes.toFixed(0)} B/s`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / 1048576).toFixed(2)} MB/s`;
  }

  const GAUGES = [
    { id: 'gauge-disk',  label: 'Capacité Stockage', unit: '%', max: 100 },
    { id: 'gauge-write', label: 'Écriture Disque',    unit: '',  max: 100 },
    { id: 'gauge-read',  label: 'Lecture Disque',     unit: '',  max: 100 },
  ];

  const _charts = {};
  let   _ready  = false;

  function _makeChart(canvasId, cfg) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return null;
    const chart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels:   [cfg.label, ''],
        datasets: [{
          data:            [0, 100],
          backgroundColor: ['rgba(0,0,0,0)', 'rgba(44,44,44,0.75)'],
          borderColor:     'transparent',
          borderWidth:     0,
          cutout:          '75%',
        }],
      },
      options: {
        responsive:    true,
        aspectRatio:   1,
        rotation:      -108,
        circumference: 216,
        animation:     { duration: 600 },
        plugins: {
          tooltip: { enabled: false },
          legend:  { display: false },
        },
      },
      plugins: ['nbGradArc', 'nbLabel'],
    });
    chart._nbConfig = cfg;
    chart._nbRaw    = '0';
    return chart;
  }

  function _setup() {
    if (_ready) return;
    const c = document.getElementById('storage-gauges');
    if (!c || !window.Chart) return;

    c.innerHTML = GAUGES.map(g => `
      <div class="gauge-wrap">
        <canvas id="${g.id}" style="max-width:150px;max-height:150px;"></canvas>
      </div>`).join('');

    GAUGES.forEach(g => { _charts[g.id] = _makeChart(g.id, g); });
    _ready = true;
  }

  function update(data) {
    _setup();
    const disk = data.disk       || {};
    const io   = data.throughput || {};

    // Capacité disque
    const pctDisk = disk.percent || 0;
    if (_charts['gauge-disk']) {
      _charts['gauge-disk'].data.datasets[0].data = [pctDisk, 100 - pctDisk];
      _charts['gauge-disk']._nbRaw = pctDisk.toFixed(1);
      _charts['gauge-disk'].update('active');
    }

    // Écriture / lecture : on affiche en KB/s via le label custom
    // On normalise sur 100 MB/s max pour la jauge visuelle
    const MAX_IO = 100 * 1024 * 1024;
    const writePct = Math.min(100, ((io.write || 0) / MAX_IO) * 100);
    const readPct  = Math.min(100, ((io.read  || 0) / MAX_IO) * 100);

    if (_charts['gauge-write']) {
      _charts['gauge-write'].data.datasets[0].data = [writePct, 100 - writePct];
      _charts['gauge-write']._nbRaw = _fmtShort(io.write || 0);
      _charts['gauge-write'].update('active');
    }
    if (_charts['gauge-read']) {
      _charts['gauge-read'].data.datasets[0].data = [readPct, 100 - readPct];
      _charts['gauge-read']._nbRaw = _fmtShort(io.read || 0);
      _charts['gauge-read'].update('active');
    }
  }

  function _fmtShort(bytes) {
    if (bytes < 1024)    return `${bytes.toFixed(0)}B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(0)}K`;
    return `${(bytes/1048576).toFixed(1)}M`;
  }

  return { update };
})();
