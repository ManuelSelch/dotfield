import type { Territory, CaptureShieldState } from '../game/types';

export function featureLabels(city: Territory, shield?: CaptureShieldState): string {
  return (city.features ?? []).map(feature => {
    switch (feature.kind) {
      case 'factory': return ` Factory ${city.owner !== 'neutral' ? 'active' : 'inactive'} (${feature.productionMultiplier}× production).`;
      case 'slow-zone': return ` Slow Zone controlled by ${city.owner}, ${Math.round(feature.speedMultiplier * 100)}% speed within ${feature.radius} units for ${city.owner === 'neutral' ? 'all traveling groups' : 'hostile traveling groups'}.`;
      case 'watchtower': return ` Watchtower controlled by ${city.owner}, firing within ${feature.range} units every ${feature.fireIntervalMs} ms (up to ${(1000 / feature.fireIntervalMs).toFixed(1)} shots/second).`;
    }
  }).join('') + (shield ? shield.remaining
    ? ` Capture shield: ${shield.remaining} of 3 charges (blocks ${shield.remaining} hostile ${shield.remaining === 1 ? 'batch' : 'batches'}).`
    : ' Capture shield depleted.' : '');
}
