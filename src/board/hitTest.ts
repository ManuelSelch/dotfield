import type { Point, Territory } from '../game/types';
import { projectBoard } from './layout';

export function hitTest(territories: readonly Territory[], width: number, height: number, point: Point) {
  return projectBoard(territories, width, height)
    .find((node) => Math.hypot(node.x - point.x, node.y - point.y) <= node.radius)?.id ?? null;
}
