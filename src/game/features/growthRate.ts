import { getFactionRules } from '../rules';
import type { SimulationState, Territory } from '../types';

export function getTerritoryGrowthRate(state: SimulationState, city: Territory): number {
  if (city.owner === 'neutral') return 0;
  let rate = getFactionRules(state, city.owner).unitsPerSecond;
  for (const feature of city.features ?? []) {
    if (feature.kind === 'factory' && feature.beneficiaryId === city.owner) rate *= feature.productionMultiplier;
  }
  if (!Number.isFinite(rate)) throw new RangeError('Territory production rate must be finite.');
  return rate;
}
