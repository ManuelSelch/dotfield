import { BATCH_INTERVAL_MS, BATCH_SIZE, TRAVEL_SPEED } from './settings';
import type { SimulationState, Transfer } from './types';

export function dispatchUnits(state: SimulationState, sourceId: string, targetId: string): SimulationState {
  const source = state.territories.find((node) => node.id === sourceId);
  const target = state.territories.find((node) => node.id === targetId);
  if (!source || !target || source === target || source.owner !== 'player' || source.units < 2) return state;

  const units = Math.floor(source.units / 2);
  const batches: Transfer[] = [];
  const durationMs = Math.max(1, Math.hypot(target.x - source.x, target.y - source.y) / TRAVEL_SPEED * 1000);
  for (let sent = 0; sent < units; sent += BATCH_SIZE) {
    const index = batches.length;
    batches.push({
      id: state.nextTransferId + index, sourceId, targetId, owner: source.owner,
      units: Math.min(BATCH_SIZE, units - sent),
      from: { x: source.x, y: source.y }, to: { x: target.x, y: target.y },
      durationMs,
      // Negative elapsed time reserves a batch until its launch time.
      elapsedMs: index === 0 ? 0 : -index * BATCH_INTERVAL_MS,
    });
  }
  return {
    ...state,
    territories: state.territories.map((node) => node === source ? { ...node, units: node.units - units } : node),
    transfers: [...state.transfers, ...batches],
    nextTransferId: state.nextTransferId + batches.length,
  };
}
