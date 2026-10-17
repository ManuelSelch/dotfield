import type { SimulationState, TerritoryState } from '../types';

/** Bounded priorities, not invented resources or future orders. Preparation leaves
 * room for economy; an active/near-completed hostile relay demands more urgency. */
export function relayPriority(state: SimulationState, source: TerritoryState, target: TerritoryState,
  distances: ReadonlyMap<string, number>, factionId: string): number {
  const relay = state.relay;
  if (!relay) return 0;
  const active = state.elapsedMs >= relay.activateAtMs;
  const hostileProgress = Math.max(0, ...Object.entries(relay.scoresMs)
    .filter(([id]) => id !== factionId).map(([,score]) => score / relay.targetMs));
  if (target.id === relay.cityId) return active ? 36 + hostileProgress * 30 : 12;
  const advance = distances.get(source.id)! - distances.get(target.id)!;
  return Number.isFinite(advance) && advance > 0 ? Math.min(active ? 18 : 8, advance / 60 * 8) : 0;
}
