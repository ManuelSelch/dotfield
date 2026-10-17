import type { SimulationState, Transfer } from './types';
import { cancelBlockedGroundQueues } from './groundAccess';

export function availableUnits(state: SimulationState, sourceId: string): number {
  const source = state.territories.find(node => node.id === sourceId);
  if (!source) return 0;
  const reserved = state.transfers.filter(batch => batch.sourceId === sourceId
    && batch.owner === source.owner && batch.elapsedMs < 0)
    .reduce((sum, batch) => sum + batch.units, 0);
  return Math.max(0, source.units - reserved);
}

// Queued troops are still defenders inside their source until their launch time.
export function launchBatches(state: SimulationState, elapsedMs: number): SimulationState {
  state = cancelBlockedGroundQueues(state);
  let territories = state.territories;
  const transfers: Transfer[] = [];
  for (const batch of [...state.transfers].sort((a, b) => b.elapsedMs - a.elapsedMs)) {
    if (batch.elapsedMs >= 0) { transfers.push(batch); continue; }
    const source = territories.find(node => node.id === batch.sourceId);
    if (!source || source.owner !== batch.owner) continue;
    if (batch.elapsedMs + elapsedMs < 0) { transfers.push(batch); continue; }
    const units = Math.min(batch.units, Math.max(0, source.units - 1));
    if (units === 0) continue;
    territories = territories.map(node => node === source ? { ...node, units: node.units - units } : node);
    transfers.push({ ...batch, units, dotSlots: batch.dotSlots.slice(0, units) });
  }
  return { ...state, territories, transfers };
}
