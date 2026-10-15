import type { SimulationState } from './types';
import { getTerritoryGrowthRate } from './features/growthRate';
import { CITY_PRODUCTION_LIMIT } from './settings';

export function advanceGrowth(state: SimulationState, elapsedMs: number): SimulationState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new RangeError('Elapsed time must be finite and non-negative.');
  }
  if (elapsedMs === 0 || state.roundStatus !== 'playing') return state;

  return {
    ...state,
    elapsedMs: state.elapsedMs + elapsedMs,
    territories: state.territories.map((node) => {
      if (node.owner === 'neutral') return node;
      if ((node.cityType ?? 'production') !== 'production') return node.growthRemainder === 0 ? node : { ...node, growthRemainder: 0 };
      if (node.units >= CITY_PRODUCTION_LIMIT) {
        return node.growthRemainder === 0 ? node : { ...node, growthRemainder: 0 };
      }
      const total = node.growthRemainder + elapsedMs * getTerritoryGrowthRate(state, node);
      // Tiny tolerance prevents floating-point rounding from delaying a whole unit.
      const produced = Math.min(CITY_PRODUCTION_LIMIT - node.units, Math.floor((total + 1e-7) / 1000));
      const units = node.units + produced;
      return {
        ...node,
        units,
        // Full cities do not bank production for later dispatches or combat losses.
        growthRemainder: units === CITY_PRODUCTION_LIMIT ? 0 : Math.max(0, total - produced * 1000),
      };
    }),
  };
}
