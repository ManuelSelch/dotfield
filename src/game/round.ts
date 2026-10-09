import { advanceWorldStep } from './worldStep';
import { SIMULATION_STEP_MS } from './settings';
import type { SimulationState } from './types';
import type { AiConfig } from './ai/config';
import { advanceAi } from './ai/tick';

export function evaluateRound(state: SimulationState): SimulationState {
  if (state.roundStatus !== 'playing') return state;
  const alive = new Set(state.territories.map(node => node.owner));
  for (const transfer of [...state.transfers, ...state.arrivals]) {
    // Unlaunched groups are counted through their source, not as airborne survivors.
    if (transfer.units > 0 && transfer.elapsedMs >= 0) alive.add(transfer.owner);
  }
  const player = alive.has('player');
  const enemy = alive.has('enemy');
  if (player && enemy) return state;
  return { ...state, roundStatus: player ? 'victory' : enemy ? 'defeat' : 'draw' };
}

export function advanceRound(state: SimulationState, elapsedMs: number, ai: AiConfig | null = null): SimulationState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Elapsed time must be finite and non-negative.');
  let next = evaluateRound(state);
  // Stop at the winning step, even when a delayed frame spans multiple arrivals.
  for (let remaining = elapsedMs; remaining > 0 && next.roundStatus === 'playing';) {
    const step = Math.min(remaining, SIMULATION_STEP_MS);
    next = evaluateRound(advanceWorldStep(next, step));
    if (ai) next = advanceAi(next, ai);
    remaining -= step;
  }
  return next;
}
