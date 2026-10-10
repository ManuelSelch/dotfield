import { BASE_FACTION_RULES } from '../rules';
import { createRoute } from '../route';
import { TERRITORY_RADIUS } from '../settings';
import type { FactionRules, Point } from '../types';
import { distance, EPSILON, finitePoint } from './geometry';
import { findPath } from './findPath';
import type { PlannedRoute, Terrain } from './types';

import { borderOffset, pointAt } from './borders';

export function planTerrainRoute(source: Point, target: Point, terrain?: Terrain,
  rules: FactionRules = BASE_FACTION_RULES): PlannedRoute | null {
  if (!finitePoint(source) || !finitePoint(target)) return null;
  if (!Number.isFinite(rules.travelSpeed) || rules.travelSpeed <= 0) throw new Error('Invalid route speed');
  if (!terrain) {
    const route = createRoute(source, target, rules);
    return { points: [route.from, route.to], distance: distance(route.from, route.to),
      durationMs: route.durationMs, crossingIds: [] };
  }
  const path = findPath(source, target, terrain);
  if (!path) return null;
  // Preserve exact legacy arithmetic when no bends or crossings are required.
  if (path.points.length <= 2 && path.crossingIds.length === 0) {
    return planTerrainRoute(source, target, undefined, rules);
  }
  let start = borderOffset(path.points, TERRITORY_RADIUS);
  let end = path.distance - borderOffset([...path.points].reverse(), TERRITORY_RADIUS);
  if (start > end) start = end = path.distance / 2;
  const points: Point[] = [pointAt(path.points, start)];
  let offset = 0;
  for (let i = 1; i < path.points.length - 1; i++) {
    offset += distance(path.points[i - 1], path.points[i]);
    if (offset > start + EPSILON && offset < end - EPSILON) points.push({ ...path.points[i] });
  }
  points.push(pointAt(path.points, end));
  const length = Math.max(0, end - start);
  return { points, distance: length, durationMs: Math.max(1, length / rules.travelSpeed * 1000),
    crossingIds: path.crossingIds };
}
