import { BATCH_INTERVAL_MS, BATCH_SIZE, TERRITORY_RADIUS, TRAVEL_SPEED } from './settings';
import type { Point } from './types';

export function createRoute(source: Point, target: Point) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  const inset = Math.min(TERRITORY_RADIUS, distance / 2);
  const ux = distance === 0 ? 0 : dx / distance;
  const uy = distance === 0 ? 0 : dy / distance;
  return {
    from: { x: source.x + ux * inset, y: source.y + uy * inset },
    to: { x: target.x - ux * inset, y: target.y - uy * inset },
    durationMs: Math.max(1, (distance - 2 * inset) / TRAVEL_SPEED * 1000),
  };
}

export function orderDurationMs(source: Point, target: Point, units: number) {
  return createRoute(source, target).durationMs
    + Math.max(0, Math.ceil(units / BATCH_SIZE) - 1) * BATCH_INTERVAL_MS;
}
