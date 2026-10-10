import type { Point } from '../types';
import { distance } from './geometry';

export function pointAt(points: readonly Point[], offset: number): Point {
  for (let i = 1; i < points.length; i++) {
    const length = distance(points[i - 1], points[i]);
    if (length > 0 && offset <= length) {
      const t = offset / length;
      return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t };
    }
    offset -= length;
  }
  return { ...points[points.length - 1] };
}

// Arc distance to the first circle exit, not simply radius along a bent path.
export function borderOffset(points: readonly Point[], radius: number): number {
  const center = points[0];
  let offset = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = distance(a, b);
    if (distance(center, b) > radius) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const cx = a.x - center.x;
      const cy = a.y - center.y;
      const linear = 2 * (cx * dx + cy * dy);
      const constant = cx * cx + cy * cy - radius * radius;
      const t = (-linear + Math.sqrt(Math.max(0, linear * linear - 4 * length * length * constant)))
        / (2 * length * length);
      return offset + t * length;
    }
    offset += length;
  }
  return offset;
}
