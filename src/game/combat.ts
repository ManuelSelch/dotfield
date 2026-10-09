import type { SimulationState } from './types';

export function resolveCombat(state: SimulationState): SimulationState {
  if (state.arrivals.length === 0) return state;
  let territories = state.territories;
  for (const arrival of state.arrivals) {
    territories = territories.map(target => {
      if (target.id !== arrival.targetId) return target;
      if (target.owner === arrival.owner) return { ...target, units: target.units + arrival.units };
      if (arrival.units <= target.units) return { ...target, units: target.units - arrival.units };
      return {
        ...target, owner: arrival.owner, units: arrival.units - target.units,
        growthRemainder: 0,
      };
    });
  }
  return { ...state, territories, arrivals: [] };
}
