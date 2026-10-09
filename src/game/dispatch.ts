import { BATCH_INTERVAL_MS, BATCH_SIZE, TERRITORY_RADIUS, TRAVEL_SPEED } from './settings';
import type { SimulationState, Transfer } from './types';
import { availableUnits } from './launch';

export function dispatchUnits(state: SimulationState, sourceId: string, targetId: string): SimulationState {
  if (state.roundStatus !== 'playing') return state;
  const source = state.territories.find((node) => node.id === sourceId);
  const target = state.territories.find((node) => node.id === targetId);
  if (!source || !target || source === target || source.owner !== 'player' || source.units < 2) return state;

  const units = Math.floor(availableUnits(state, sourceId) / 2);
  if (units === 0) return state;
  const batches: Transfer[] = [];
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  const inset = Math.min(TERRITORY_RADIUS, distance / 2);
  const ux = distance === 0 ? 0 : dx / distance;
  const uy = distance === 0 ? 0 : dy / distance;
  const from = { x: source.x + ux * inset, y: source.y + uy * inset };
  const to = { x: target.x - ux * inset, y: target.y - uy * inset };
  const durationMs = Math.max(1, (distance - 2 * inset) / TRAVEL_SPEED * 1000);
  for (let sent = 0; sent < units; sent += BATCH_SIZE) {
    const index = batches.length;
    batches.push({
      id: state.nextTransferId + index, sourceId, targetId, owner: source.owner,
      units: Math.min(BATCH_SIZE, units - sent),
      from, to,
      durationMs,
      // Negative elapsed time reserves a batch until its launch time.
      elapsedMs: index === 0 ? 0 : -index * BATCH_INTERVAL_MS,
    });
  }
  return {
    ...state,
    territories: state.territories.map((node) => node === source ? { ...node, units: node.units - batches[0].units } : node),
    transfers: [...state.transfers, ...batches],
    nextTransferId: state.nextTransferId + batches.length,
  };
}
