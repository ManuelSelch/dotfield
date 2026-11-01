import type { Point } from './types';

// Earliest contact in [0, 1] between two moving circles; null means a miss.
export function sweptContact(
  a0: Point,
  a1: Point,
  b0: Point,
  b1: Point,
  radius: number,
): number | null {
  const x = a0.x - b0.x;
  const y = a0.y - b0.y;
  const vx = a1.x - a0.x - (b1.x - b0.x);
  const vy = a1.y - a0.y - (b1.y - b0.y);
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const a = vx * vx + vy * vy;
  if (a === 0) return null;
  const b = 2 * (x * vx + y * vy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const time = (-b - Math.sqrt(discriminant)) / (2 * a);
  return time >= 0 && time <= 1 ? time : null;
}
