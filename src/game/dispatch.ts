import { BATCH_INTERVAL_MS, BATCH_SIZE } from './settings';
import type { Faction, SimulationState, Transfer } from './types';
import { createRoute } from './route';
import { availableUnits } from './launch';

export function dispatchUnits(state: SimulationState, sourceId: string, targetId: string, faction: Faction = 'player'): SimulationState {
  if (state.roundStatus !== 'playing') return state;
  const source = state.territories.find((node) => node.id === sourceId);
  const target = state.territories.find((node) => node.id === targetId);
  if (!source || !target || source === target || source.owner !== faction || source.units < 2) return state;

  const units = availableUnits(state, sourceId) - 1;
  if (units <= 0) return state;
  const batches: Transfer[] = [];
  const route = createRoute(source, target);
  for (let sent = 0; sent < units; sent += BATCH_SIZE) {
    const index = batches.length;
    batches.push({
      id: state.nextTransferId + index, sourceId, targetId, owner: faction,
      units: Math.min(BATCH_SIZE, units - sent),
      ...route,
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
