import { advanceGrowth } from '../growth';
import { advanceTravel } from '../travel';
import { resolveCombat } from '../combat';
import { SIMULATION_STEP_MS } from '../settings';
import type { SimulationState } from '../types';

// Replay known orders only, without inventing future player orders or running AI.
// Skip quiet steps while keeping launches/impacts on the real simulation's grid.
export function forecastBattle(state: SimulationState, horizonMs: number): SimulationState {
  if (!Number.isFinite(horizonMs) || horizonMs < 0) throw new RangeError('Forecast horizon must be finite and non-negative.');
  if (state.roundStatus !== 'playing' || horizonMs === 0) return state;
  let next = resolveCombat(state);
  for (let remaining = horizonMs; remaining > 0;) {
    const eventMs = Math.min(...next.transfers.map(t => t.elapsedMs < 0
      ? -t.elapsedMs : t.durationMs - t.elapsedMs));
    const step = Math.min(remaining, Math.max(SIMULATION_STEP_MS,
      Math.ceil(eventMs / SIMULATION_STEP_MS) * SIMULATION_STEP_MS));
    next = resolveCombat(advanceTravel(advanceGrowth(next, step), step));
    remaining -= step;
  }
  return next;
}
