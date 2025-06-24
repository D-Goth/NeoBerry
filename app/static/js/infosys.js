export function loadSystemInfo() {
  const os = document.getElementById('sys-os');
  const hostname = document.getElementById('sys-hostname');
  const uptime = document.getElementById('sys-uptime');

  if (!os || !hostname || !uptime) {
    console.warn("[INFOSYS] Éléments système introuvables dans le DOM.");
    return;
  }

  os.textContent = hostname.textContent = uptime.textContent = '⏳';

  fetch('/api/infosys')
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(data => {
      os.textContent = data.os || '—';
      hostname.textContent = data.hostname || '—';
      uptime.textContent = data.uptime || '—';
    })
    .catch(() => {
      os.textContent = hostname.textContent = uptime.textContent = '—';
    });
}

