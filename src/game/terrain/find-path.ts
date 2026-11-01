import type { Point } from '@/game/types';

import { corners, distance, EPSILON, visible, walkable } from './geometry';
import type { Terrain } from './types';

interface Edge {
  readonly node: number;
  readonly distance: number;
  readonly crossingId?: string;
}
const key = (point: Point) => `${point.x},${point.y}`;

// Small visibility graph: corners support detours; only authored edges cross barriers.
export function findPath(source: Point, target: Point, terrain: Terrain) {
  if (!walkable(source, terrain) || !walkable(target, terrain)) return null;
  const candidates = terrain.barriers
    .flatMap((b) => corners(b.bounds))
    .concat(terrain.crossings.flatMap((c) => [c.from, c.to]))
    .filter((p) => walkable(p, terrain))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const nodes: Point[] = [source];
  const indices = new Map<string, number>([[key(source), 0]]);
  for (const point of [target, ...candidates])
    if (!indices.has(key(point))) {
      indices.set(key(point), nodes.length);
      nodes.push(point);
    }

  const targetIndex = indices.get(key(target))!;
  const graph: Edge[][] = nodes.map(() => []);
  function link(a: number, b: number, crossingId?: string) {
    const length = distance(nodes[a], nodes[b]);
    graph[a].push({ node: b, distance: length, crossingId });
    graph[b].push({ node: a, distance: length, crossingId });
  }
  for (let a = 0; a < nodes.length; a++)
    for (let b = a + 1; b < nodes.length; b++) if (visible(nodes[a], nodes[b], terrain)) link(a, b);

  for (const crossing of [...terrain.crossings].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  )) {
    const a = indices.get(key(crossing.from));
    const b = indices.get(key(crossing.to));
    if (a !== undefined && b !== undefined) link(a, b, crossing.id);
  }
  const lengths = nodes.map(() => Infinity);
  const visited = new Set<number>();
  const previous = new Map<number, { node: number; crossingId?: string }>();
  lengths[0] = 0;
  while (visited.size < nodes.length) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++)
      // Equal paths keep the first node in coordinate order, independent of input order.
      if (
        !visited.has(i) &&
        Number.isFinite(lengths[i]) &&
        (current === -1 || lengths[i] < lengths[current] - EPSILON)
      )
        current = i;

    if (current === -1) return null;
    if (current === targetIndex) break;
    visited.add(current);
    for (const edge of graph[current]) {
      const length = lengths[current] + edge.distance;
      if (!visited.has(edge.node) && length < lengths[edge.node] - EPSILON) {
        lengths[edge.node] = length;
        previous.set(edge.node, { node: current, crossingId: edge.crossingId });
      }
    }
  }
  const points: Point[] = [nodes[targetIndex]];
  const crossingIds: string[] = [];
  let node = targetIndex;
  while (node !== 0) {
    const step = previous.get(node)!;
    if (step.crossingId) crossingIds.unshift(step.crossingId);
    node = step.node;
    points.unshift(nodes[node]);
  }
  return { points, crossingIds, distance: lengths[targetIndex] };
}
