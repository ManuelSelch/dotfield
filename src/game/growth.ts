import type { SimulationState } from './types';
import { getTerritoryGrowthRate } from './features/growthRate';

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
      const total = node.growthRemainder + elapsedMs * getTerritoryGrowthRate(state, node);
      // Tiny tolerance prevents floating-point rounding from delaying a whole unit.
      const produced = Math.floor((total + 1e-7) / 1000);
      return {
        ...node,
        units: node.units + produced,
        growthRemainder: Math.max(0, total - produced * 1000),
      };
    }),
  };
}
