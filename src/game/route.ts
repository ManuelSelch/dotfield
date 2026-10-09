import { BATCH_SIZE, TERRITORY_RADIUS } from './settings';
import { BASE_FACTION_RULES } from './rules';
import type { FactionRules, Point, Transfer } from './types';
import { traveledTime } from './movement';

export function createRoute(source: Point, target: Point, rules: FactionRules = BASE_FACTION_RULES) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  const inset = Math.min(TERRITORY_RADIUS, distance / 2);
  const ux = distance === 0 ? 0 : dx / distance;
  const uy = distance === 0 ? 0 : dy / distance;
  return {
    from: { x: source.x + ux * inset, y: source.y + uy * inset },
    to: { x: target.x - ux * inset, y: target.y - uy * inset },
    durationMs: Math.max(1, (distance - 2 * inset) / rules.travelSpeed * 1000),
  };
}

export function remainingTravelBound(transfer: Transfer, minimumMultiplier = 1): number {
  return Math.max(0, -transfer.elapsedMs) + Math.max(0, transfer.durationMs - traveledTime(transfer)) / minimumMultiplier;
}

export function orderDurationMs(source: Point, target: Point, units: number, rules: FactionRules = BASE_FACTION_RULES,
  minimumMultiplier = 1) {
  return createRoute(source, target, rules).durationMs / minimumMultiplier
    + Math.max(0, Math.ceil(units / BATCH_SIZE) - 1) * rules.batchIntervalMs;
}
