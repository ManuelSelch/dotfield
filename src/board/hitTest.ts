import type { Point, Territory } from '../game/types';
import { projectBoard } from './layout';

// A Voronoi cell is exactly the area nearest to its city. No polygon test needed.
export function hitTest(territories: readonly Territory[], width: number, height: number, point: Point) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0
    || !Number.isFinite(point.x) || !Number.isFinite(point.y)
    || point.x < 0 || point.y < 0 || point.x > width || point.y > height) return null;
  let nearest: string | null = null;
  let best = Infinity;
  for (const city of projectBoard(territories, width, height)) {
    const distance = (city.x - point.x) ** 2 + (city.y - point.y) ** 2;
    if (distance < best - 1e-7) { nearest = city.id; best = distance; }
  }
  return nearest;
}
