import type { Territory, CaptureShieldState } from '../game/types';

export function featureLabels(city: Territory, shield?: CaptureShieldState, shieldCapacity?: number): string {
  return (city.features ?? []).map(feature => {
    switch (feature.kind) {
      case 'factory': return ` Factory ${city.owner !== 'neutral' ? 'active' : 'inactive'} (${feature.productionMultiplier}× production).`;
      case 'slow-zone': return ` Slow Zone controlled by ${city.owner}, ${Math.round(feature.speedMultiplier * 100)}% speed within ${feature.radius} units for ${city.owner === 'neutral' ? 'all traveling groups' : 'hostile traveling groups'}.`;
      case 'artillery': return ` Artillery ${city.owner === 'neutral' ? 'inactive' : `controlled by ${city.owner}`}, nearest hostile garrison within ${feature.range} units, one defender every ${feature.fireIntervalMs} ms. Mountains block shots; troops must capture cities.`;
      case 'watchtower': return ` Watchtower controlled by ${city.owner}, firing within ${feature.range} units every ${feature.fireIntervalMs} ms (up to ${(1000 / feature.fireIntervalMs).toFixed(1)} shots/second).`;
    }
  }).join('') + (shieldCapacity
    ? ` Defensive Network shields: ${shield?.remaining ?? 0} stored (capacity ${shieldCapacity}); one recharges every 10 seconds while connected. Each blocks one hostile troop-arrival batch.`
    : shield ? shield.remaining
      ? ` Shields: ${shield.remaining} active ${shield.remaining === 1 ? 'charge' : 'charges'}; each blocks one hostile troop-arrival batch.`
      : ' Shields depleted.' : '');
}
