import { createGauge, getGaugeColor } from './gauges.js';

/**
 * Retourne la valeur minimale entre deux.
 */
export function customMin(a, b) {
   return a < b ? a : b;
}

/**
 * Retourne la valeur maximale entre deux.
 */
export function customMax(a, b) {
   return a > b ? a : b;
}

/**
 * Analyse une chaîne de type '12.5 Mb/s' et retourne le nombre en bits.
 */
export function parseSpeed(speedStr) {
   if (!speedStr || speedStr === 'N/A') return 0;
   const match = speedStr.match(/([\d.]+)\s*(b\/s|kb\/s|mb\/s|gb\/s)/i);
   if (!match) return 0;

   const value = parseFloat(match[1]);
   const unit = match[2].toLowerCase();

   switch (unit) {
      case 'gb/s': return value * 1024 * 1024 * 1024;
      case 'mb/s': return value * 1024 * 1024;
      case 'kb/s': return value * 1024;
      case 'b/s':  return value;
      default:     return 0;
   }
}

/**
 * Met à jour une jauge réseau en fonction de la bande passante.
 */
export function updateBandwidth(canvasId, speed, label) {
   const ctx = document.getElementById(canvasId).getContext('2d');
   let gauge = Chart.getChart(ctx);
   if (!gauge) {
      gauge = createGauge(ctx, label, 0, canvasId === 'network-up' || canvasId === 'network-down');
   }

   let value = parseSpeed(speed) || 0;
   const maxSpeed = 100 * 1024 * 1024;
   let percentage = value > maxSpeed ? 100 : (value / maxSpeed) * 100;
   percentage = percentage < 0 ? 0 : percentage;

   let convertedValue = value;
   let unit = 'b/s';

   if (convertedValue >= 1024 * 1024 * 1024) {
      convertedValue = convertedValue / (1024 * 1024 * 1024);
      unit = 'Gb/s';
   } else if (convertedValue >= 1024 * 1024) {
      convertedValue = convertedValue / (1024 * 1024);
      unit = 'Mb/s';
   } else if (convertedValue >= 1024) {
      convertedValue = convertedValue / 1024;
      unit = 'Kb/s';
   }

   convertedValue = convertedValue.toFixed(2);

   gauge.data.datasets[0].data[0] = percentage;
   gauge.data.datasets[0].data[1] = 100 - percentage;
   gauge.data.datasets[0].backgroundColor[0] = getGaugeColor(percentage);
   gauge.data.labels = [label, 'Libre'];

   if (canvasId === 'network-up' || canvasId === 'network-down') {
      gauge.valueToDisplay = `${convertedValue} ${unit}`;
   }

   gauge.update();
}

