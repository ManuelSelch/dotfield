import { contains, entersInterior, finitePoint, inside, visible, walkable } from './geometry';
import type { Bounds, Terrain } from './types';

function validateBounds(bounds: Bounds) {
  if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite)
    || bounds.minX >= bounds.maxX || bounds.minY >= bounds.maxY) {
    throw new Error('Terrain bounds must have finite positive area');
  }
}

export function createTerrain(input: Terrain): Terrain {
  validateBounds(input.bounds);
  const ids = new Set<string>();
  function addId(id: string) {
    if (!id.trim() || ids.has(id)) throw new Error(`Invalid or duplicate terrain ID: ${id}`);
    ids.add(id);
  }
  for (const barrier of input.barriers) {
    addId(barrier.id);
    validateBounds(barrier.bounds);
    if (!['river', 'mountain'].includes(barrier.kind)
      || !contains(input.bounds, { x: barrier.bounds.minX, y: barrier.bounds.minY })
      || !contains(input.bounds, { x: barrier.bounds.maxX, y: barrier.bounds.maxY })) {
      throw new Error(`Invalid barrier: ${barrier.id}`);
    }
  }
  // The initial authoring model uses disjoint rectangles. Reject ambiguous
  // shared boundaries instead of treating zero-width seams as navigable paths.
  for (let i = 0; i < input.barriers.length; i++) {
    for (let j = i + 1; j < input.barriers.length; j++) {
      const a = input.barriers[i].bounds;
      const b = input.barriers[j].bounds;
      if (a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY) {
        throw new Error('Terrain barriers must not overlap or touch');
      }
    }
  }
  for (const crossing of input.crossings) {
    addId(crossing.id);
    const barrier = input.barriers.find(b => b.id === crossing.barrierId);
    if (!barrier || crossing.kind !== (barrier.kind === 'river' ? 'bridge' : 'pass')) {
      throw new Error(`Invalid crossing barrier/kind: ${crossing.id}`);
    }
    for (const point of [crossing.from, crossing.to]) {
      if (!finitePoint(point) || !contains(barrier.bounds, point) || inside(barrier.bounds, point)
        || !walkable(point, input)) throw new Error(`Invalid crossing endpoint: ${crossing.id}`);
    }
    if (!entersInterior(crossing.from, crossing.to, barrier.bounds)
      || !visible(crossing.from, crossing.to, input, barrier.id)) {
      throw new Error(`Crossing must traverse only its own barrier: ${crossing.id}`);
    }
  }
  return Object.freeze({
    bounds: Object.freeze({ ...input.bounds }),
    barriers: Object.freeze(input.barriers.map(b => Object.freeze({ ...b, bounds: Object.freeze({ ...b.bounds }) }))),
    crossings: Object.freeze(input.crossings.map(c => Object.freeze({ ...c,
      from: Object.freeze({ ...c.from }), to: Object.freeze({ ...c.to }) }))),
  });
}
