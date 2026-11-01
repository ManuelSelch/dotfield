import type { River } from './river';
import { createRoute } from './route';
import { logicalTerritoryRegions } from './territory-regions';
import type { Point, Territory } from './types';

const EPSILON = 1e-7;
/** Entry fraction for a positive-length intersection with a convex CCW region.
 * Includes collinear edge travel, excludes isolated vertex/endpoint tangency. */
export function segmentRegionEntry(
  from: Point,
  to: Point,
  polygon: readonly Point[],
): number | null {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = Math.hypot(dx, dy);
  if (length <= EPSILON || polygon.length < 3) return null;
  let enter = 0,
    exit = 1;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i],
      b = polygon[(i + 1) % polygon.length];
    const ex = b.x - a.x,
      ey = b.y - a.y,
      edgeLength = Math.hypot(ex, ey);
    if (edgeLength <= EPSILON) continue;
    const start = (ex * (from.y - a.y) - ey * (from.x - a.x)) / edgeLength;
    const rate = (ex * dy - ey * dx) / edgeLength;
    if (Math.abs(rate) <= EPSILON) {
      if (start < -EPSILON) return null;
      continue;
    }
    const t = -start / rate;
    if (rate > 0) enter = Math.max(enter, t);
    else exit = Math.min(exit, t);
    if (enter > exit) return null;
  }
  return (exit - enter) * length > EPSILON ? enter : null;
}

/** Target exemption applies only to that city. Source owner may be overridden
 * for strategic queries; actual dispatch always supplies the issuing faction. */
export function firstDefenderBlocker(
  territories: readonly Territory[],
  source: Territory,
  target: Territory,
  river?: River,
  faction = source.owner,
): Territory | undefined {
  const hostile = territories.filter(
    (c) =>
      c.cityType === 'defender' &&
      c.owner !== 'neutral' &&
      c.owner !== faction &&
      c.id !== target.id,
  );
  if (!hostile.length) return undefined;
  const regions = logicalTerritoryRegions(territories, river);
  const route = createRoute(source, target);
  let first: Territory | undefined,
    entry = Infinity;
  for (const city of hostile) {
    const polygon = regions.find((r) => r.id === city.id)!.points;
    const fraction = segmentRegionEntry(route.from, route.to, polygon);
    if (
      fraction !== null &&
      (fraction < entry - EPSILON || (Math.abs(fraction - entry) <= EPSILON && city.id < first!.id))
    ) {
      first = city;
      entry = fraction;
    }
  }
  return first;
}
