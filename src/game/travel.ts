import type { SimulationState, Transfer } from './types';
import { launchBatches } from './launch';

export { transferPosition } from './movement';

export function advanceTravel(state: SimulationState, elapsedMs: number): SimulationState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Elapsed time must be finite and non-negative.');
  if (elapsedMs === 0 || state.roundStatus !== 'playing' || state.transfers.length === 0) return state;
  state = launchBatches(state, elapsedMs);
  const transfers: Transfer[] = [];
  const arrivals = [...state.arrivals];
  // Resolve batches in arrival order, including when a frame spans multiple arrivals.
  for (const transfer of [...state.transfers].sort((a, b) =>
    (a.durationMs - a.elapsedMs) - (b.durationMs - b.elapsedMs) || a.id - b.id)) {
    const elapsed = Math.min(transfer.durationMs, transfer.elapsedMs + elapsedMs);
    const next = { ...transfer, elapsedMs: elapsed };
    if (elapsed + 1e-7 >= transfer.durationMs) arrivals.push({ ...next, elapsedMs: transfer.durationMs });
    else transfers.push(next);
  }
  // Each completed batch is consumed by combat in the same simulation update.
  return { ...state, transfers, arrivals };
}
