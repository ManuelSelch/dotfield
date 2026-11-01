import { firstDefenderBlocker } from './defender-borders';
import { canRiverOrder } from './river';
import { getFactionRules } from './rules';
import { canDirectTerrainOrder } from './terrain/direct-order';
import type { Terrain } from './terrain/types';
import type { SimulationState, Territory } from './types';

export type GroundOrderBlockReason =
  | { readonly reason: 'same-city' | 'river' | 'terrain' }
  | { readonly reason: 'defender'; readonly blockerId: string };

export function groundOrderBlockReason(
  state: SimulationState,
  source: Territory,
  target: Territory,
  faction = source.owner,
  terrain: Terrain | undefined = state.terrain,
): GroundOrderBlockReason | null {
  if (source.id === target.id) return { reason: 'same-city' };
  if (!canRiverOrder(source, target, state.river)) return { reason: 'river' };
  if (!canDirectTerrainOrder(source, target, terrain, getFactionRules(state, faction)))
    return { reason: 'terrain' };
  const blocker = firstDefenderBlocker(state.territories, source, target, state.river, faction);
  return blocker ? { reason: 'defender', blockerId: blocker.id } : null;
}

export function canGroundOrder(
  state: SimulationState,
  source: Territory,
  target: Territory,
  faction = source.owner,
  terrain: Terrain | undefined = state.terrain,
): boolean {
  return groundOrderBlockReason(state, source, target, faction, terrain) === null;
}

/** Reservations still belong to source garrisons. Cancellation never refunds or
 * removes actual troops, and never touches committed ground batches or aircraft. */
export function cancelBlockedGroundQueues(state: SimulationState): SimulationState {
  const transfers = state.transfers.filter((t) => {
    if (t.elapsedMs >= 0) return true;
    const source = state.territories.find((c) => c.id === t.sourceId),
      target = state.territories.find((c) => c.id === t.targetId);
    return (
      source && target && source.owner === t.owner && canGroundOrder(state, source, target, t.owner)
    );
  });
  return transfers.length === state.transfers.length ? state : { ...state, transfers };
}
