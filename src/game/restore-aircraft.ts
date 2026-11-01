import {
  AIRCRAFT_CAPACITY,
  AIRCRAFT_PREPARATION_MS,
  AIRCRAFT_SPEED_MULTIPLIER,
  AIRCRAFT_TURNAROUND_MS,
  AIR_DELIVERY_INTERVAL_MS,
  BATCH_SIZE,
  TERRITORY_RADIUS,
} from './settings';
import type { Aircraft, Point, SimulationState } from './types';

function invalid(): never {
  throw new RangeError('Invalid saved aircraft runtime.');
}
function record(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function close(a: number, b: number): boolean {
  return Number.isFinite(a) && Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(b));
}
function point(value: Point, expected: Point): boolean {
  return record(value) && close(value.x, expected.x) && close(value.y, expected.y);
}
function integer(value: number, min = 0): boolean {
  return Number.isSafeInteger(value) && value >= min;
}

/** Strict restore, deliberately unlike live ownership normalization: missing slots must not mint free planes. */
export function restoreAircraft(
  state: SimulationState,
): Pick<SimulationState, 'aircraft' | 'nextAircraftTripId' | 'airDeliveries'> {
  const slots = state.aircraft ?? {};
  if (!record(slots) || state.aircraft === null) invalid();
  const homes = state.territories.filter((c) => c.cityType === 'airfield' && c.owner !== 'neutral');
  if (Object.keys(slots).length !== homes.length) invalid();
  const trips = new Set<number>();
  let maxTrip = 0;
  for (const [id, plane] of Object.entries(slots)) {
    const home = homes.find((c) => c.id === id);
    if (
      !home ||
      !record(plane) ||
      plane.homeId !== id ||
      plane.owner !== home.owner ||
      !Object.hasOwn(state.rules.factions, plane.owner) ||
      !integer(plane.tripId) ||
      !integer(plane.cargo) ||
      plane.cargo > AIRCRAFT_CAPACITY ||
      !Number.isFinite(plane.elapsedMs) ||
      plane.elapsedMs < 0 ||
      !Number.isFinite(plane.durationMs) ||
      plane.durationMs < 0 ||
      plane.elapsedMs > plane.durationMs + 1e-7 ||
      plane.elapsedMs > state.elapsedMs + 1e-7
    )
      invalid();
    if (plane.tripId > 0) {
      if (trips.has(plane.tripId)) invalid();
      trips.add(plane.tripId);
      maxTrip = Math.max(maxTrip, plane.tripId);
    }
    const atHome = { x: home.x, y: home.y };
    if (plane.phase === 'preparing' || (plane.phase === 'ready' && plane.tripId === 0)) {
      if (
        plane.tripId !== 0 ||
        plane.targetId !== undefined ||
        plane.cargo !== 0 ||
        !point(plane.from, atHome) ||
        !point(plane.to, atHome) ||
        !point(plane.position, atHome) ||
        plane.durationMs !== (plane.phase === 'ready' ? 0 : AIRCRAFT_PREPARATION_MS) ||
        (plane.phase === 'ready' && plane.elapsedMs !== 0)
      )
        invalid();
      continue;
    }
    const target = state.territories.find((c) => c.id === plane.targetId);
    if (!target || target.id === id || plane.tripId === 0) invalid();
    const distance = Math.hypot(home.x - target.x, home.y - target.y);
    const radius = Math.min(TERRITORY_RADIUS, distance);
    const dock =
      distance === 0
        ? { x: target.x, y: target.y }
        : {
            x: target.x + ((home.x - target.x) * radius) / distance,
            y: target.y + ((home.y - target.y) * radius) / distance,
          };
    const loaded = plane.phase === 'outbound' || plane.phase === 'unloading';
    const from = loaded ? atHome : dock;
    const to = loaded ? dock : atHome;
    const travel = plane.phase === 'outbound' || plane.phase === 'returning';
    const duration = travel
      ? (Math.hypot(to.x - from.x, to.y - from.y) * 1000) /
        (state.rules.factions[plane.owner].travelSpeed * AIRCRAFT_SPEED_MULTIPLIER)
      : plane.phase === 'unloading'
        ? AIR_DELIVERY_INTERVAL_MS
        : plane.phase === 'turnaround'
          ? AIRCRAFT_TURNAROUND_MS
          : plane.phase === 'ready'
            ? 0
            : invalid();
    const progress = duration === 0 ? 1 : plane.elapsedMs / duration;
    const position = travel
      ? { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress }
      : plane.phase === 'unloading'
        ? dock
        : atHome;
    if (
      (loaded ? plane.cargo < 1 : plane.cargo !== 0) ||
      !close(plane.durationMs, duration) ||
      !point(plane.from, from) ||
      !point(plane.to, to) ||
      !point(plane.position, position) ||
      (plane.phase === 'ready' && plane.elapsedMs !== 0)
    )
      invalid();
  }
  const deliveries = state.airDeliveries ?? [];
  if (!Array.isArray(deliveries) || state.airDeliveries === null) invalid();
  const eventIds = new Set<string>();
  for (const event of deliveries) {
    // Historical feedback may outlive home capture or conversion; do not require current allegiance/type.
    if (
      !record(event) ||
      !state.territories.some((c) => c.id === event.homeId) ||
      !state.territories.some((c) => c.id === event.targetId) ||
      event.homeId === event.targetId ||
      typeof event.owner !== 'string' ||
      !Object.hasOwn(state.rules.factions, event.owner) ||
      !integer(event.tripId, 1) ||
      !integer(event.units, 1) ||
      event.units > BATCH_SIZE ||
      !Number.isFinite(event.atMs) ||
      event.atMs < 0 ||
      event.atMs > state.elapsedMs ||
      !['blocked', 'reinforced', 'defended', 'captured'].includes(event.result)
    )
      invalid();
    const key = JSON.stringify([event.homeId, event.tripId, event.atMs]);
    if (eventIds.has(key)) invalid();
    eventIds.add(key);
    maxTrip = Math.max(maxTrip, event.tripId);
  }
  const next =
    state.nextAircraftTripId === undefined
      ? maxTrip === 0 && homes.length === 0
        ? 1
        : invalid()
      : state.nextAircraftTripId;
  if (!integer(next, 1) || next <= maxTrip || next === Number.MAX_SAFE_INTEGER) invalid();
  return {
    aircraft: Object.fromEntries(Object.entries(slots).map(([id, p]) => [id, clonePlane(p)])),
    nextAircraftTripId: next,
    airDeliveries: deliveries.map((e) => ({ ...e })),
  };
}
function clonePlane(p: Aircraft): Aircraft {
  return { ...p, from: { ...p.from }, to: { ...p.to }, position: { ...p.position } };
}
