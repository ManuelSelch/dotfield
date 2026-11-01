import { normalizeAircraft } from './aircraft-state';
import { resolveArrivalBatch } from './combat';
import { getFactionRules } from './rules';
import {
  AIRCRAFT_CAPACITY,
  AIRCRAFT_SPEED_MULTIPLIER,
  AIRCRAFT_TURNAROUND_MS,
  AIR_DELIVERY_INTERVAL_MS,
  AIR_DELIVERY_FEEDBACK_MS,
  BATCH_SIZE,
  TERRITORY_RADIUS,
} from './settings';
import type { Aircraft, FactionId, Point, SimulationState } from './types';
export { createAircraft, normalizeAircraft } from './aircraft-state';

function travelDuration(state: SimulationState, owner: FactionId, from: Point, to: Point): number {
  return (
    (Math.hypot(to.x - from.x, to.y - from.y) * 1000) /
    (getFactionRules(state, owner).travelSpeed * AIRCRAFT_SPEED_MULTIPLIER)
  );
}
function put(state: SimulationState, plane: Aircraft): SimulationState {
  return { ...state, aircraft: { ...state.aircraft, [plane.homeId]: plane } };
}

export function launchAircraft(
  state: SimulationState,
  homeId: string,
  targetId: string,
  faction: FactionId = 'player',
): SimulationState {
  if (state.roundStatus !== 'playing' || faction === 'neutral') return state;
  const home = state.territories.find((c) => c.id === homeId);
  const target = state.territories.find((c) => c.id === targetId);
  const plane = state.aircraft?.[homeId];
  if (
    !home ||
    !target ||
    home === target ||
    home.owner !== faction ||
    home.cityType !== 'airfield' ||
    !plane ||
    plane.owner !== faction ||
    plane.phase !== 'ready' ||
    home.units < 2
  )
    return state;
  const cargo = Math.min(AIRCRAFT_CAPACITY, Math.floor(home.units) - 1);
  const distance = Math.hypot(home.x - target.x, home.y - target.y);
  const radius = Math.min(TERRITORY_RADIUS, distance);
  const to =
    distance === 0
      ? { x: target.x, y: target.y }
      : {
          x: target.x + ((home.x - target.x) * radius) / distance,
          y: target.y + ((home.y - target.y) * radius) / distance,
        };
  const from = { x: home.x, y: home.y };
  const tripId = state.nextAircraftTripId ?? 1;
  return put(
    {
      ...state,
      nextAircraftTripId: tripId + 1,
      territories: state.territories.map((c) =>
        c === home ? { ...c, units: c.units - cargo } : c,
      ),
      transfers: state.transfers.filter((t) => t.sourceId !== homeId || t.elapsedMs >= 0),
    },
    {
      ...plane,
      targetId,
      tripId,
      cargo,
      phase: 'outbound',
      from,
      to,
      position: from,
      elapsedMs: 0,
      durationMs: travelDuration(state, faction, from, to),
    },
  );
}

/** Minimum time to the next plane phase transition/pulse. Ready planes have no deadline. */
export function nextAircraftEventMs(state: SimulationState): number {
  return Math.min(
    Infinity,
    ...Object.values(state.aircraft ?? {})
      .filter((p) => p.phase !== 'ready')
      .map((p) => Math.max(0, p.durationMs - p.elapsedMs)),
  );
}

export function advanceAircraftClock(state: SimulationState, elapsedMs: number): SimulationState {
  state = normalizeAircraft(state);
  let aircraft = state.aircraft;
  for (const plane of Object.values(aircraft ?? {})) {
    if (plane.phase === 'ready') continue;
    const elapsed = Math.min(plane.durationMs, plane.elapsedMs + elapsedMs);
    const progress = plane.durationMs === 0 ? 1 : elapsed / plane.durationMs;
    const position =
      plane.phase === 'outbound' || plane.phase === 'returning'
        ? {
            x: plane.from.x + (plane.to.x - plane.from.x) * progress,
            y: plane.from.y + (plane.to.y - plane.from.y) * progress,
          }
        : plane.position;
    aircraft = { ...aircraft, [plane.homeId]: { ...plane, elapsedMs: elapsed, position } };
  }
  return aircraft === state.aircraft ? state : { ...state, aircraft };
}

/** Called after all equal-time ground arrivals, before shield recharge and city effects.
 * Stable home ID then trip ID ordering; each capture immediately invalidates its home's old plane.
 */
export function resolveAircraftEvents(state: SimulationState): SimulationState {
  const feedback = (state.airDeliveries ?? []).filter(
    (e) => state.elapsedMs - e.atMs < AIR_DELIVERY_FEEDBACK_MS,
  );
  if (feedback.length !== (state.airDeliveries?.length ?? 0))
    state = { ...state, airDeliveries: feedback };
  const ordered = Object.values(state.aircraft ?? {}).sort(
    (a, b) => a.homeId.localeCompare(b.homeId, 'en') || a.tripId - b.tripId,
  );
  for (const expected of ordered) {
    const plane = state.aircraft?.[expected.homeId];
    if (
      !plane ||
      plane !== expected ||
      plane.phase === 'ready' ||
      plane.elapsedMs + 1e-7 < plane.durationMs
    )
      continue;
    if (plane.phase === 'preparing' || plane.phase === 'turnaround')
      state = put(state, { ...plane, phase: 'ready', elapsedMs: 0, durationMs: 0 });
    else if (plane.phase === 'outbound')
      state = put(state, {
        ...plane,
        phase: 'unloading',
        position: plane.to,
        elapsedMs: 0,
        durationMs: AIR_DELIVERY_INTERVAL_MS,
      });
    else if (plane.phase === 'returning')
      state = put(state, {
        ...plane,
        phase: 'turnaround',
        elapsedMs: 0,
        durationMs: AIRCRAFT_TURNAROUND_MS,
      });
    else {
      const units = Math.min(BATCH_SIZE, plane.cargo);
      const { state: delivered, result } = resolveArrivalBatch(state, {
        targetId: plane.targetId!,
        owner: plane.owner,
        units,
      });
      state = {
        ...delivered,
        airDeliveries: [
          ...(delivered.airDeliveries ?? []),
          {
            homeId: plane.homeId,
            tripId: plane.tripId,
            targetId: plane.targetId!,
            owner: plane.owner,
            units,
            atMs: state.elapsedMs,
            result,
          },
        ],
      };
      const cargo = plane.cargo - units;
      if (cargo > 0) state = put(state, { ...plane, cargo, elapsedMs: 0 });
      else {
        const home = state.territories.find((c) => c.id === plane.homeId)!;
        const to = { x: home.x, y: home.y };
        state = put(state, {
          ...plane,
          cargo: 0,
          phase: 'returning',
          from: plane.position,
          to,
          elapsedMs: 0,
          durationMs: travelDuration(state, plane.owner, plane.position, to),
        });
      }
    }
  }
  return state;
}
