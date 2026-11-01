import { BATCH_SIZE, DOT_RADIUS, DOT_SPACING, TERRITORY_RADIUS } from './settings';
import type { Territory } from './types';

export interface RiverBridge {
  readonly id: string;
  readonly northId: string;
  readonly southId: string;
  readonly width: number;
}
export interface River {
  readonly top: number;
  readonly bottom: number;
  readonly bridges: readonly RiverBridge[];
}

const formationRadius = ((BATCH_SIZE - 1) / 2) * DOT_SPACING + DOT_RADIUS;
const clearance = Math.max(TERRITORY_RADIUS, formationRadius);

// A deliberately small map contract: horizontal river, aligned endpoint pairs.
// Keeping all legal legs straight retains the existing shared dot/collision model.
export function createRiver(input: River, cities: readonly Territory[]): River {
  if (
    !Number.isFinite(input.top) ||
    !Number.isFinite(input.bottom) ||
    input.top <= 0 ||
    input.bottom >= 480 ||
    input.top >= input.bottom ||
    !Array.isArray(input.bridges) ||
    !input.bridges.length
  )
    throw new RangeError('Invalid river bounds or bridges.');
  const ids = new Set<string>(),
    endpoints = new Set<string>();
  const cityIds = new Set<string>();
  for (const city of cities) {
    if (
      !city.id ||
      cityIds.has(city.id) ||
      !Number.isFinite(city.x) ||
      !Number.isFinite(city.y) ||
      city.x < clearance ||
      city.x > 360 - clearance ||
      city.y < TERRITORY_RADIUS ||
      city.y > 480 - TERRITORY_RADIUS ||
      !(city.y <= input.top - clearance || city.y >= input.bottom + clearance)
    )
      throw new RangeError(
        'River cities must have distinct IDs and formation clearance from water.',
      );

    cityIds.add(city.id);
  }
  const occupied: [number, number][] = [];
  const bridges = input.bridges.map((bridge) => {
    const north = cities.find((c) => c.id === bridge.northId),
      south = cities.find((c) => c.id === bridge.southId);
    if (
      !bridge.id ||
      ids.has(bridge.id) ||
      endpoints.has(bridge.northId) ||
      endpoints.has(bridge.southId) ||
      !north ||
      !south ||
      north.y >= input.top ||
      south.y <= input.bottom ||
      north.x !== south.x ||
      !Number.isFinite(bridge.width) ||
      bridge.width < formationRadius * 2 ||
      north.x - bridge.width / 2 < 0 ||
      north.x + bridge.width / 2 > 360
    )
      throw new RangeError('Invalid, unaligned or too narrow bridge pair.');

    const span: [number, number] = [north.x - bridge.width / 2, north.x + bridge.width / 2];
    if (occupied.some(([left, right]) => span[0] <= right && span[1] >= left))
      throw new RangeError('Bridges overlap.');
    occupied.push(span);
    ids.add(bridge.id);
    endpoints.add(bridge.northId);
    endpoints.add(bridge.southId);
    return Object.freeze({
      id: bridge.id,
      northId: bridge.northId,
      southId: bridge.southId,
      width: bridge.width,
    });
  });
  return Object.freeze({ top: input.top, bottom: input.bottom, bridges: Object.freeze(bridges) });
}

export function pairedCityId(id: string, river?: River): string | undefined {
  const bridge = river?.bridges.find((b) => b.northId === id || b.southId === id);
  return bridge && (bridge.northId === id ? bridge.southId : bridge.northId);
}

export function canRiverOrder(source: Territory, target: Territory, river?: River): boolean {
  if (source.id === target.id) return false;
  if (!river) return true;
  const north = (city: Territory) => city.y < river.top;
  return north(source) === north(target) || pairedCityId(source.id, river) === target.id;
}

// The same authored geometry is consumed by Canvas and SVG previews.
export function bridgeDecks(river: River, cities: readonly Territory[]) {
  return river.bridges.map((bridge) => ({
    id: bridge.id,
    x: cities.find((c) => c.id === bridge.northId)!.x - bridge.width / 2,
    y: river.top - 4,
    width: bridge.width,
    height: river.bottom - river.top + 8,
  }));
}

// Strategic distance over legal city legs, not an automatically forwarded order.
export function riverDistance(
  source: Territory,
  target: Territory,
  cities: readonly Territory[],
  river?: River,
): number {
  const leg = (a: Territory, b: Territory) =>
    Math.max(0, Math.hypot(a.x - b.x, a.y - b.y) - 2 * TERRITORY_RADIUS);
  if (!river) return Math.hypot(source.x - target.x, source.y - target.y);
  const distances = new Map(cities.map((c) => [c.id, c.id === source.id ? 0 : Infinity]));
  const remaining = [...cities];
  while (remaining.length) {
    remaining.sort((a, b) => distances.get(a.id)! - distances.get(b.id)!);
    const city = remaining.shift()!,
      distance = distances.get(city.id)!;
    if (city.id === target.id || !Number.isFinite(distance)) return distance;
    for (const next of remaining)
      if (canRiverOrder(city, next, river))
        distances.set(next.id, Math.min(distances.get(next.id)!, distance + leg(city, next)));
  }
  return Infinity;
}
