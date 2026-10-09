import { dotPosition } from '../dots';
import type { SimulationState, Transfer } from '../types';

function removeDot(transfers: readonly Transfer[], transferId: number, slot: number): readonly Transfer[] {
  return transfers.flatMap(transfer => {
    if (transfer.id !== transferId) return [transfer];
    const dotSlots = transfer.dotSlots.filter(candidate => candidate !== slot);
    return dotSlots.length ? [{ ...transfer, dotSlots, units: dotSlots.length }] : [];
  });
}

/** Fire at most once per reached cadence boundary; ties resolve by distance, order ID, then stable dot slot. */
export function advanceWatchtowers(state: SimulationState, elapsedMs: number): SimulationState {
  const clocks = { ...state.watchtowerElapsedMs };
  let transfers = state.transfers;
  let changed = false;
  for (const city of state.territories) for (const feature of city.features ?? []) {
    if (feature.kind !== 'watchtower') continue;
    const total = (clocks[feature.id] ?? 0) + elapsedMs;
    const shots = Math.floor((total + 1e-7) / feature.fireIntervalMs);
    clocks[feature.id] = total - shots * feature.fireIntervalMs;
    if (!shots || city.owner === 'neutral') continue;
    for (let shot = 0; shot < shots; shot++) {
      const candidates = transfers.filter(transfer => transfer.owner !== city.owner)
        .flatMap(transfer => transfer.dotSlots.map(slot => ({ transfer, slot,
          point: dotPosition(transfer, slot),
        }))).filter(target => Math.hypot(target.point.x - city.x, target.point.y - city.y) <= feature.range)
        .sort((a, b) => Math.hypot(a.point.x - city.x, a.point.y - city.y)
          - Math.hypot(b.point.x - city.x, b.point.y - city.y)
          || a.transfer.id - b.transfer.id || a.slot - b.slot);
      const target = candidates[0];
      if (target) { transfers = removeDot(transfers, target.transfer.id, target.slot); changed = true; }
    }
  }
  return { ...state, watchtowerElapsedMs: clocks, ...(changed ? { transfers } : {}) };
}
