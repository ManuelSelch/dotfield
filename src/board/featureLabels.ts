import type { Territory } from '../game/types';

export function featureLabels(city: Territory): string {
  return (city.features ?? []).map(feature => {
    switch (feature.kind) {
      case 'factory': return ` Factory ${city.owner === feature.beneficiaryId ? 'active' : 'inactive'} (${feature.productionMultiplier}× production).`;
      case 'watchtower': return ` Watchtower controlled by ${city.owner}, firing within ${feature.range} units every ${feature.fireIntervalMs} ms (up to ${(1000 / feature.fireIntervalMs).toFixed(1)} shots/second).`;
    }
  }).join('');
}
