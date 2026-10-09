import { transferPosition, traveledTime } from './movement';
import { DOT_SPACING } from './settings';
import type { Transfer } from './types';

export interface FormationGeometry {
  readonly center: { x: number; y: number };
  readonly perpendicular: { x: number; y: number };
  readonly spacing: number;
}

/** Calculates the shared geometry once per formation, rather than once per dot. */
export function formationGeometry(batch: Transfer, traveledMs = traveledTime(batch)): FormationGeometry {
  const center = transferPosition(batch, traveledMs);
  const dx = batch.to.x - batch.from.x;
  const dy = batch.to.y - batch.from.y;
  const length = Math.hypot(dx, dy) || 1;
  const progress = traveledMs / batch.durationMs;
  const opening = Math.max(0, Math.min(1, progress / 0.3));
  const gathering = Math.max(0, Math.min(1, (progress - 0.8) / 0.2));
  const spread = opening * opening * (3 - 2 * opening)
    * (1 - gathering * gathering * (3 - 2 * gathering));
  return {
    center,
    perpendicular: { x: -dy / length, y: dx / length },
    spacing: DOT_SPACING * spread,
  };
}

export function dotPosition(batch: Transfer, slot: number, traveledMs = traveledTime(batch)) {
  const geometry = formationGeometry(batch, traveledMs);
  const offset = (slot - (batch.formationSize - 1) / 2) * geometry.spacing;
  return {
    x: geometry.center.x + geometry.perpendicular.x * offset,
    y: geometry.center.y + geometry.perpendicular.y * offset,
  };
}
