import type { Point } from '@/game/types';

import type { Bounds, Terrain } from './types';

export const EPSILON = 1e-9;
export const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
export const finitePoint = (p: Point) => Number.isFinite(p.x) && Number.isFinite(p.y);
export const contains = (b: Bounds, p: Point) =>
  p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;
export const inside = (b: Bounds, p: Point) =>
  p.x > b.minX && p.x < b.maxX && p.y > b.minY && p.y < b.maxY;

// Positive-length overlap with the OPEN rectangle. Tangency/bank travel is legal.
export function entersInterior(a: Point, b: Point, bounds: Bounds): boolean {
  let from = 0;
  let to = 1;
  for (const [start, delta, low, high] of [
    [a.x, b.x - a.x, bounds.minX, bounds.maxX],
    [a.y, b.y - a.y, bounds.minY, bounds.maxY],
  ])
    if (delta === 0) {
      if (start <= low || start >= high) return false;
    } else {
      const t1 = (low - start) / delta;
      const t2 = (high - start) / delta;
      from = Math.max(from, Math.min(t1, t2));
      to = Math.min(to, Math.max(t1, t2));
    }

  return to > from;
}

export function walkable(point: Point, terrain: Terrain): boolean {
  if (!finitePoint(point) || !contains(terrain.bounds, point)) return false;
  return terrain.barriers.every(({ bounds: b }) => {
    if (inside(b, point)) return false;
    // No zero-width escape between a barrier and the field edge.
    return !(
      contains(b, point) &&
      (point.x === terrain.bounds.minX ||
        point.x === terrain.bounds.maxX ||
        point.y === terrain.bounds.minY ||
        point.y === terrain.bounds.maxY)
    );
  });
}

function blocksFieldEdge(a: Point, b: Point, obstacle: Bounds, field: Bounds): boolean {
  const overlap = (a: number, b: number, low: number, high: number) =>
    Math.min(Math.max(a, b), high) > Math.max(Math.min(a, b), low);
  for (const x of [field.minX, field.maxX])
    if (
      a.x === x &&
      b.x === x &&
      (obstacle.minX === x || obstacle.maxX === x) &&
      overlap(a.y, b.y, obstacle.minY, obstacle.maxY)
    )
      return true;

  for (const y of [field.minY, field.maxY])
    if (
      a.y === y &&
      b.y === y &&
      (obstacle.minY === y || obstacle.maxY === y) &&
      overlap(a.x, b.x, obstacle.minX, obstacle.maxX)
    )
      return true;

  return false;
}

export function visible(
  a: Point,
  b: Point,
  terrain: Terrain,
  permittedBarrierId?: string,
): boolean {
  return terrain.barriers.every(
    (barrier) =>
      barrier.id === permittedBarrierId ||
      (!entersInterior(a, b, barrier.bounds) &&
        !blocksFieldEdge(a, b, barrier.bounds, terrain.bounds)),
  );
}

export function corners(b: Bounds): Point[] {
  return [
    { x: b.minX, y: b.minY },
    { x: b.minX, y: b.maxY },
    { x: b.maxX, y: b.minY },
    { x: b.maxX, y: b.maxY },
  ];
}
