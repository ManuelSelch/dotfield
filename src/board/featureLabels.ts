import type { Territory } from '../game/types';

export function featureLabels(city: Territory): string {
  return (city.features ?? []).map(feature => {
    switch (feature.kind) {
      case 'factory': return ` Factory ${city.owner !== 'neutral' ? 'active' : 'inactive'} (${feature.productionMultiplier}× production).`;
      case 'slow-zone': return ` Slow Zone controlled by ${city.owner}, ${Math.round(feature.speedMultiplier * 100)}% speed within ${feature.radius} units for ${city.owner === 'neutral' ? 'all traveling groups' : 'hostile traveling groups'}.`;
      case 'artillery': return ` Artillery ${city.owner === 'neutral' ? 'inactive' : `controlled by ${city.owner}`}, nearest hostile garrison within ${feature.range} units, one defender every ${feature.fireIntervalMs} ms. Mountains block shots; troops must capture cities.`;
      case 'watchtower': return ` Watchtower controlled by ${city.owner}, firing within ${feature.range} units every ${feature.fireIntervalMs} ms (up to ${(1000 / feature.fireIntervalMs).toFixed(1)} shots/second).`;
    }
  }).join('');
}
