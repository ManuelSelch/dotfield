import { createAircraft } from './aircraft-state';
import { consumeShield } from './features/capture-shield';
import { cancelBlockedGroundQueues } from './ground-access';
import { launchBatches } from './launch';
import { getFactionRules } from './rules';
import type { AirDelivery, FactionId, SimulationState } from './types';

/** The single combat path for ground arrivals and aircraft delivery pulses. */
export function resolveArrivalBatch(
  state: SimulationState,
  arrival: { targetId: string; owner: FactionId; units: number },
): { state: SimulationState; result: AirDelivery['result'] } {
  const target = state.territories.find((c) => c.id === arrival.targetId);
  if (!target || arrival.units <= 0 || state.roundStatus !== 'playing')
    return { state, result: 'defended' };
  if (target.owner !== arrival.owner && (state.captureShields[target.id]?.remaining ?? 0) > 0)
    return {
      result: 'blocked',
      state: {
        ...state,
        captureShields: {
          ...state.captureShields,
          [target.id]: consumeShield(state.captureShields[target.id], state.elapsedMs),
        },
      },
    };

  const friendly = target.owner === arrival.owner;
  const captured = !friendly && arrival.units > target.units;
  const next = {
    ...target,
    units: friendly ? target.units + arrival.units : Math.abs(target.units - arrival.units),
    ...(captured ? { owner: arrival.owner, growthRemainder: 0 } : {}),
  };
  let updated: SimulationState = {
    ...state,
    territories: state.territories.map((c) => (c === target ? next : c)),
  };
  if (captured) {
    const { [target.id]: _shield, ...captureShields } = state.captureShields;
    const charges = getFactionRules(state, arrival.owner).captureShieldBatches ?? 0;
    const nextShields = charges
      ? { ...captureShields, [target.id]: { remaining: charges } }
      : captureShields;
    const { [target.id]: _plane, ...aircraft } = state.aircraft ?? {};
    const nextAircraft =
      target.cityType === 'airfield'
        ? { ...aircraft, [target.id]: createAircraft(next) }
        : aircraft;
    const { [target.id]: _timer, ...networkShieldTimers } = state.networkShieldTimers ?? {};
    const nextTimers =
      target.cityType === 'defender' || state.rules.factions[arrival.owner]?.connectedDefense
        ? {
            ...networkShieldTimers,
            [target.id]: { owner: arrival.owner, elapsedMs: 0, resetAtMs: state.elapsedMs },
          }
        : networkShieldTimers;
    const weaponTimers =
      target.cityType === 'artillery' || target.cityType === 'watchtower'
        ? { ...state.weaponTimers, [target.id]: { owner: arrival.owner, elapsedMs: 0 } }
        : state.weaponTimers;
    updated = {
      ...updated,
      captureShields: nextShields,
      networkShieldTimers: nextTimers,
      ...(target.cityType === 'artillery' || target.cityType === 'watchtower'
        ? { weaponTimers }
        : {}),
      ...(state.aircraft || target.cityType === 'airfield' ? { aircraft: nextAircraft } : {}),
      // Cancel immediately: capture followed by recapture must not revive old reservations.
      transfers: state.transfers.filter((t) => t.sourceId !== target.id || t.elapsedMs >= 0),
    };
  }
  return {
    state: captured ? cancelBlockedGroundQueues(updated) : updated,
    result: friendly ? 'reinforced' : captured ? 'captured' : 'defended',
  };
}

export function resolveCombat(state: SimulationState): SimulationState {
  if (state.roundStatus !== 'playing' || state.arrivals.length === 0) return state;
  for (const arrival of state.arrivals) state = resolveArrivalBatch(state, arrival).state;
  return launchBatches({ ...state, arrivals: [] }, 0);
}
