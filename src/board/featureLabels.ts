import type { Territory } from '../game/types';

export function featureLabels(city: Territory): string {
  return (city.features ?? []).map(feature => {
    switch (feature.kind) {
      case 'factory': return ` Factory ${city.owner === feature.beneficiaryId ? 'active' : 'inactive'} (${feature.productionMultiplier}× production).`;
    }
  }).join('');
}
