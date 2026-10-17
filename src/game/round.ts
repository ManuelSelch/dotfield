import { advanceWorldStep } from './worldStep';
import { SIMULATION_STEP_MS } from './settings';
import type { SimulationState } from './types';
import type { AiConfig } from './ai/config';
import { advanceAi, type AiConfigurations } from './ai/tick';

import { evaluateRound } from './outcome';
export { evaluateRound } from './outcome';

export function advanceRound(state: SimulationState, elapsedMs: number, ai: AiConfig | AiConfigurations | null = null): SimulationState {
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
