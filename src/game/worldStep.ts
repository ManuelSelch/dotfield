import { advanceGrowth } from './growth';
import { advanceTravel } from './travel';
import { resolveCombat } from './combat';
import type { SimulationState } from './types';

// Shared physical update for live rounds and forecasts; never issues AI orders.
// Orchestrators retain their existing stepping and round-evaluation semantics.
export function advanceWorldStep(state: SimulationState, elapsedMs: number): SimulationState {
  return resolveCombat(advanceTravel(advanceGrowth(state, elapsedMs), elapsedMs));
}
