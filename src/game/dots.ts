import { transferPosition, traveledTime } from './movement';
import { DOT_SPACING } from './settings';
import type { Transfer } from './types';

export function dotPosition(batch: Transfer, slot: number, traveledMs = traveledTime(batch)) {
  const point = transferPosition(batch, traveledMs);
  const dx = batch.to.x - batch.from.x;
  const dy = batch.to.y - batch.from.y;
  const length = Math.hypot(dx, dy) || 1;
  const progress = traveledMs / batch.durationMs;
  const opening = Math.max(0, Math.min(1, progress / 0.3));
  const gathering = Math.max(0, Math.min(1, (progress - 0.8) / 0.2));
  const spread = opening * opening * (3 - 2 * opening)
    * (1 - gathering * gathering * (3 - 2 * gathering));
  const offset = (slot - (batch.formationSize - 1) / 2) * DOT_SPACING * spread;
  return { x: point.x - dy / length * offset, y: point.y + dx / length * offset };
}
