import { advanceGrowth } from './growth';
import { advanceTravel } from './travel';
import { resolveCombat } from './combat';
import type { SimulationState } from './types';
import { advanceWatchtowers } from './features/watchtower';
import { SIMULATION_STEP_MS } from './settings';
import { hasSlowZones } from './features/slowZone';
import { advanceArtillery } from './features/artillery';

function physicalStep(state: SimulationState, elapsedMs: number) {
  return advanceArtillery(advanceWatchtowers(resolveCombat(advanceTravel(advanceGrowth(state, elapsedMs), elapsedMs)), elapsedMs), elapsedMs, state);
}

// Shared physical update for live rounds and forecasts; never issues AI orders.
// Orchestrators retain their existing stepping and round-evaluation semantics.
export function advanceWorldStep(state: SimulationState, elapsedMs: number): SimulationState {
  if ((hasSlowZones(state) || state.territories.some(city => city.features?.some(feature => feature.kind === 'watchtower' || feature.kind === 'artillery')))
    && elapsedMs > SIMULATION_STEP_MS) {
    for (let remaining = elapsedMs; remaining > 0;) {
      const step = Math.min(remaining, SIMULATION_STEP_MS);
      state = physicalStep(state, step);
      remaining -= step;
    }
    return state;
  }
  return physicalStep(state, elapsedMs);
}
