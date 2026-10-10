import type { FactionRules, Territory } from '../types';
import type { Terrain } from './types';
import { createRoute } from '../route';
import { planTerrainRoute } from './routes';

// Production movement currently supports straight legs only. Reject bends/crossings
// rather than drawing a detour while troops actually travel through a mountain.
export function canDirectTerrainOrder(source: Territory, target: Territory, terrain?: Terrain, rules?: FactionRules): boolean {
  if (source.id === target.id) return false;
  if (!terrain) return true;
  const direct = createRoute(source, target, rules);
  const planned = planTerrainRoute(source, target, terrain, rules);
  return !!planned && planned.points.length === 2 && planned.crossingIds.length === 0
    && planned.points[0].x === direct.from.x && planned.points[0].y === direct.from.y
    && planned.points[1].x === direct.to.x && planned.points[1].y === direct.to.y;
}
