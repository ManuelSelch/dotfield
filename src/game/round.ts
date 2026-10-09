import { advanceGrowth } from './growth';
import { advanceTravel } from './travel';
import { resolveCombat } from './combat';
import { SIMULATION_STEP_MS } from './settings';
import type { SimulationState } from './types';

export function evaluateRound(state: SimulationState): SimulationState {
  if (state.roundStatus !== 'playing') return state;
  const alive = new Set(state.territories.map(node => node.owner));
  for (const transfer of [...state.transfers, ...state.arrivals]) {
    if (transfer.units > 0) alive.add(transfer.owner);
  }
  const player = alive.has('player');
  const enemy = alive.has('enemy');
  if (player && enemy) return state;
  return { ...state, roundStatus: player ? 'victory' : enemy ? 'defeat' : 'draw' };
}

export function advanceRound(state: SimulationState, elapsedMs: number): SimulationState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Elapsed time must be finite and non-negative.');
  let next = evaluateRound(state);
  // Stop at the winning step, even when a delayed frame spans multiple arrivals.
  for (let remaining = elapsedMs; remaining > 0 && next.roundStatus === 'playing';) {
    const step = Math.min(remaining, SIMULATION_STEP_MS);
    next = evaluateRound(resolveCombat(advanceTravel(advanceGrowth(next, step), step)));
    remaining -= step;
  }
  return next;
}
