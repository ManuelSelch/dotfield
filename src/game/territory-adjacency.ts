import type { River } from './river';
import { logicalTerritoryRegions } from './territory-regions';
import type { Point, Territory } from './types';

const EDGE_EPSILON = 1e-5;
const adjacencyCache = new Map<string, ReadonlyMap<string, ReadonlySet<string>>>();

function topologyKey(territories: readonly Territory[], river?: River): string {
  const sites = territories.map((city) => `${city.id}:${city.x}:${city.y}`).join('|');
  const bridges =
    river?.bridges.map((bridge) => `${bridge.northId}:${bridge.southId}`).join('|') ?? '';
  return `${river ? `${river.top}:${river.bottom}` : 'no-river'}:${bridges}:${sites}`;
}

function sharedEdgeLength(a: Point, b: Point, c: Point, d: Point): number {
  const abX = b.x - a.x,
    abY = b.y - a.y;
  const length = Math.hypot(abX, abY);
  if (length <= EDGE_EPSILON) return 0;
  const cdX = d.x - c.x,
    cdY = d.y - c.y;
  if (Math.abs(abX * cdY - abY * cdX) > EDGE_EPSILON * length * Math.hypot(cdX, cdY)) return 0;
  const distanceFromLine = (point: Point) =>
    Math.abs(abX * (point.y - a.y) - abY * (point.x - a.x)) / length;
  if (distanceFromLine(c) > EDGE_EPSILON || distanceFromLine(d) > EDGE_EPSILON) return 0;
  const ux = abX / length,
    uy = abY / length;
  const projection = (point: Point) => (point.x - a.x) * ux + (point.y - a.y) * uy;
  const overlap =
    Math.min(length, Math.max(projection(c), projection(d))) -
    Math.max(0, Math.min(projection(c), projection(d)));
  return overlap > EDGE_EPSILON ? overlap : 0;
}

function regionsShareBorder(a: readonly Point[], b: readonly Point[]): boolean {
  for (let i = 0; i < a.length; i++) {
    const aStart = a[i],
      aEnd = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++)
      if (sharedEdgeLength(aStart, aEnd, b[j], b[(j + 1) % b.length]) > 0) return true;
  }
  return false;
}

/** Neighbor links are shared territory-region borders, plus explicitly paired river bridges. */
export function adjacentTerritoryIds(
  territories: readonly Territory[],
  river?: River,
): ReadonlyMap<string, ReadonlySet<string>> {
  const key = topologyKey(territories, river);
  const cached = adjacencyCache.get(key);
  if (cached) {
    adjacencyCache.delete(key);
    adjacencyCache.set(key, cached);
    return cached;
  }
  const regions = logicalTerritoryRegions(territories, river);
  const neighbors = new Map(territories.map((city) => [city.id, new Set<string>()]));
  for (let i = 0; i < regions.length; i++)
    for (let j = i + 1; j < regions.length; j++) {
      if (!regionsShareBorder(regions[i].points, regions[j].points)) continue;
      neighbors.get(regions[i].id)!.add(regions[j].id);
      neighbors.get(regions[j].id)!.add(regions[i].id);
    }

  for (const bridge of river?.bridges ?? []) {
    neighbors.get(bridge.northId)?.add(bridge.southId);
    neighbors.get(bridge.southId)?.add(bridge.northId);
  }
  adjacencyCache.set(key, neighbors);
  if (adjacencyCache.size > 8) adjacencyCache.delete(adjacencyCache.keys().next().value!);
  return neighbors;
}
