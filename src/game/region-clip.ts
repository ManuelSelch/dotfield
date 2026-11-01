import type { Point } from './types';

// Keep the half-plane closer to city than to other (Sutherland–Hodgman clipping).
export function clipToCity(polygon: readonly Point[], city: Point, other: Point): Point[] {
  const dx = other.x - city.x;
  const dy = other.y - city.y;
  const limit = (other.x ** 2 + other.y ** 2 - city.x ** 2 - city.y ** 2) / 2;
  const side = (p: Point) => dx * p.x + dy * p.y - limit;
  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[(i + polygon.length - 1) % polygon.length];
    const b = polygon[i];
    const da = side(a),
      db = side(b);
    const aInside = da <= 1e-7,
      bInside = db <= 1e-7;
    if (aInside !== bInside) {
      const t = da / (da - db);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    if (bInside) result.push(b);
  }
  return result;
}
