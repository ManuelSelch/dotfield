import type { SimulationState, Transfer } from './types';
import { launchBatches } from './launch';
import { hasOpposingTransfers, resolveTravelCollisions } from './collisions';
import { SIMULATION_STEP_MS } from './settings';
import { hasSlowZones } from './features/slowZone';
import { trajectory } from './trajectory';

export { transferPosition } from './movement';

export function advanceTravel(state: SimulationState, elapsedMs: number): SimulationState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Elapsed time must be finite and non-negative.');
  if (elapsedMs === 0 || state.roundStatus !== 'playing' || state.transfers.length === 0) return state;
  for (let remaining = elapsedMs; remaining > 0 && state.transfers.length > 0;) {
    // Formation offsets are eased curves: bound sweep segments even after a delayed frame.
    const step = hasOpposingTransfers(state) || hasSlowZones(state) ? Math.min(remaining, SIMULATION_STEP_MS) : remaining;
    state = travelStep(state, step);
    remaining -= step;
  }
  return state;
}

function travelStep(state: SimulationState, elapsedMs: number): SimulationState {
  state = launchBatches(state, elapsedMs);
  const variable = hasSlowZones(state);
  const motions = new Map(state.transfers.map(t => [t.id, trajectory(t, elapsedMs, variable ? state : undefined)]));
  state = resolveTravelCollisions(state, elapsedMs, motions);
  const transfers: Transfer[] = [];
  const arrivals = [...state.arrivals];
  // Resolve batches by actual completion offset, not unslowed duration minus age.
  for (const transfer of [...state.transfers].sort((a, b) =>
    (motions.get(a.id)!.arrivalMs ?? Infinity) - (motions.get(b.id)!.arrivalMs ?? Infinity) || a.id - b.id)) {
    const motion = motions.get(transfer.id)!;
    const elapsed = transfer.elapsedMs + (motion.arrivalMs ?? elapsedMs);
    const next = { ...transfer, elapsedMs: elapsed,
      ...(variable || transfer.traveledMs !== undefined ? { traveledMs: motion.traveledMs } : {}) };
    if (motion.arrivalMs !== null) arrivals.push(next);
    else transfers.push(next);
  }
  // Each completed batch is consumed by combat in the same simulation update.
  return { ...state, transfers, arrivals };
}
