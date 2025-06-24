import { updateBandwidth } from './utils.js';

/**
 * Récupère les statistiques réseau (upload/download)
 * et met à jour les jauges correspondantes.
 */
export function fetchNetworkStats() {
   fetch('/api/network')
      .then((response) => {
         if (!response.ok) throw new Error(`Erreur API : ${response.status}`);
         return response.json();
      })
      .then((data) => {
         if (!data.metrics) return;
         updateBandwidth('network-up', data.metrics.network_up, 'Upload');
         updateBandwidth('network-down', data.metrics.network_down, 'Download');
      })
      .catch((error) => console.error('Erreur lors de la récupération des stats réseau :', error));
}

