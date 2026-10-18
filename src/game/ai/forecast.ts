import { advanceWorldStep } from '../worldStep';
import { resolveCombat } from '../combat';
import { SIMULATION_STEP_MS } from '../settings';
import type { SimulationState } from '../types';
import { hasOpposingTransfers } from '../collisions';
import { hasSlowZones } from '../features/slowZone';
import { traveledTime } from '../movement';

// Replay known orders only, without inventing future player orders or running AI.
// Skip quiet steps while keeping launches/impacts on the real simulation's grid.
export function forecastBattle(state: SimulationState, horizonMs: number, beforeStep?: (state: SimulationState) => void): SimulationState {
  if (!Number.isFinite(horizonMs) || horizonMs < 0) throw new RangeError('Forecast horizon must be finite and non-negative.');
  if (state.roundStatus !== 'playing' || horizonMs === 0) return state;
  beforeStep?.(state);
  let next = resolveCombat(state);
  for (let remaining = horizonMs; remaining > 0 && next.roundStatus === 'playing';) {
    beforeStep?.(next);
    const eventMs = Math.min(...next.transfers.map(t => t.elapsedMs < 0
      ? -t.elapsedMs : t.durationMs - traveledTime(t)));
    // A quiet ground queue is not a quiet world: preparation, air pulses,
    // home loss and Defender recharge can all change combat between arrivals.
    const cityEvents = !!next.relay || next.territories.some(c => ['airfield', 'defender', 'watchtower', 'artillery'].includes(c.cityType ?? 'production'));
    // advanceWorldStep owns exact internal physical event splitting for city roles;
    // replay the full remaining forecast span to avoid cumulative clock drift.
    const step = cityEvents ? remaining : Math.min(remaining, hasOpposingTransfers(next) || hasSlowZones(next)
      ? SIMULATION_STEP_MS : Math.max(SIMULATION_STEP_MS, Math.ceil(eventMs / SIMULATION_STEP_MS) * SIMULATION_STEP_MS));
    next = advanceWorldStep(next, step, beforeStep);
    remaining -= step;
  }
  return next;
}
