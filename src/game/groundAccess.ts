import { firstDefenderBlocker } from './defenderBorders';
import { canRiverOrder } from './river';
import { canDirectTerrainOrder } from './terrain/directOrder';
import { getFactionRules } from './rules';
import type { SimulationState, Territory } from './types';
import type { Terrain } from './terrain/types';

export function canGroundOrder(state: SimulationState, source: Territory, target: Territory,
  faction = source.owner, terrain: Terrain | undefined = state.terrain): boolean {
  return source.id !== target.id && canRiverOrder(source, target, state.river)
    && canDirectTerrainOrder(source, target, terrain, getFactionRules(state, faction))
    && !firstDefenderBlocker(state.territories, source, target, state.river, faction);
}

/** Reservations still belong to source garrisons. Cancellation never refunds or
 * removes actual troops, and never touches committed ground batches or aircraft. */
export function cancelBlockedGroundQueues(state: SimulationState): SimulationState {
  const transfers = state.transfers.filter(t => {
    if (t.elapsedMs >= 0) return true;
    const source = state.territories.find(c => c.id === t.sourceId), target = state.territories.find(c => c.id === t.targetId);
    return source && target && source.owner === t.owner && canGroundOrder(state, source, target, t.owner);
  });
  return transfers.length === state.transfers.length ? state : { ...state, transfers };
}
