import type { SimulationState, Territory } from './types';

export interface RelayDefinition {
  readonly cityId: string;
  readonly activateAtMs: number;
  readonly targetMs: number;
}
export interface RelayState extends RelayDefinition {
  readonly scoresMs: Readonly<Record<string, number>>;
}
export const RELAY_TIMING = Object.freeze({ activateAtMs: 120000, targetMs: 180000 });

export function createRelay(definition: RelayDefinition, cities: readonly Territory[], factions: readonly string[]): RelayState {
  if (!cities.some(c => c.id === definition.cityId) || !Number.isFinite(definition.activateAtMs) || definition.activateAtMs < 0
    || !Number.isFinite(definition.targetMs) || definition.targetMs <= 0) throw new RangeError('Invalid relay definition.');
  return Object.freeze({ cityId: definition.cityId, activateAtMs: definition.activateAtMs, targetMs: definition.targetMs,
    scoresMs: Object.freeze(Object.fromEntries(factions.map(id => [id, 0]))) });
}

export function nextRelayEventMs(state: SimulationState): number {
  const relay = state.relay;
  if (!relay) return Infinity;
  if (state.elapsedMs < relay.activateAtMs) return relay.activateAtMs - state.elapsedMs;
  const owner = state.territories.find(c => c.id === relay.cityId)!.owner;
  return owner === 'neutral' ? Infinity : Math.max(0, relay.targetMs - relay.scoresMs[owner]);
}

/** Credit the owner during the interval, never the captor at its endpoint. */
export function advanceRelay(before: SimulationState, after: SimulationState): SimulationState {
  const relay = before.relay;
  if (!relay) return after;
  const owner = before.territories.find(c => c.id === relay.cityId)!.owner;
  const heldMs = Math.max(0, after.elapsedMs - Math.max(before.elapsedMs, relay.activateAtMs));
  if (!heldMs || owner === 'neutral') return after;
  return { ...after, relay: { ...relay, scoresMs: { ...relay.scoresMs,
    [owner]: Math.min(relay.targetMs, relay.scoresMs[owner] + heldMs) } } };
}
