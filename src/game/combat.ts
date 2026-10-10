import type { SimulationState } from './types';
import { launchBatches } from './launch';
import { getFactionRules } from './rules';
import { consumeShield } from './features/captureShield';

export function resolveCombat(state: SimulationState): SimulationState {
  if (state.roundStatus !== 'playing' || state.arrivals.length === 0) return state;
  let territories = state.territories;
  let captureShields = state.captureShields;
  for (const arrival of state.arrivals) {
    if (arrival.units <= 0) continue;
    territories = territories.map(target => {
      if (target.id !== arrival.targetId) return target;
      if (target.owner === arrival.owner) return { ...target, units: target.units + arrival.units };
      const shield = captureShields[target.id];
      if (shield?.remaining > 0) {
        captureShields = { ...captureShields, [target.id]: consumeShield(shield, state.elapsedMs) };
        return target;
      }
      if (arrival.units <= target.units) return { ...target, units: target.units - arrival.units };
      const charges = getFactionRules(state, arrival.owner).captureShieldBatches ?? 0;
      if (charges) captureShields = { ...captureShields, [target.id]: { remaining: charges } };
      else if (shield) {
        const { [target.id]: _old, ...rest } = captureShields;
        captureShields = rest;
      }
      return {
        ...target, owner: arrival.owner, units: arrival.units - target.units,
        growthRemainder: 0,
      };
    });
  }
  return launchBatches({ ...state, territories, captureShields, arrivals: [] }, 0);
}
