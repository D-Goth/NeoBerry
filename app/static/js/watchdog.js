// watchdog.js

/**
 * Surveille le retour en ligne de NeoBerry après un redémarrage.
 * 
 * @param {Function} closeCallback - fonction à appeler quand NeoBerry est à nouveau dispo
 * @param {Object} [options] - options facultatives : timeout, interval, endpoint
 */
export function waitForNeoBerryToRestart(closeCallback, options = {}) {
  const {
    maxTries = 30,
    intervalMs = 2000,
    pingEndpoint = '/api/status'
  } = options;

  const progress = document.getElementById('progress-bar');
  let tries = 0;

  const interval = setInterval(() => {
    fetch(pingEndpoint)
      .then((res) => {
        if (!res.ok) throw new Error('Status non OK');
        return res.json();
      })
      .then(() => {
        clearInterval(interval);
        progress?.classList.add('hidden');
        if (typeof closeCallback === 'function') closeCallback();
      })
      .catch(() => {
        tries++;
        if (tries >= maxTries) {
          clearInterval(interval);
          progress?.classList.add('hidden');
          alert("⛔ Échec du redémarrage de NeoBerry. Recharge manuelle suggérée.");
        }
      });
  }, intervalMs);
}

