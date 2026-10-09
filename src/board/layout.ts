import type { Point, Territory } from '../game/types';

export const FIELD = { width: 360, height: 480, radius: 29 } as const;

export function fieldTransform(width: number, height: number) {
  const scale = Math.min(width / FIELD.width, height / FIELD.height);
  return { scale, offsetX: (width - FIELD.width * scale) / 2, offsetY: (height - FIELD.height * scale) / 2 };
}

export function screenPoint(point: Point, width: number, height: number) {
  const { scale, offsetX, offsetY } = fieldTransform(width, height);
  return { x: offsetX + point.x * scale, y: offsetY + point.y * scale };
}

export function projectBoard(territories: readonly Territory[], width: number, height: number) {
  const { scale, offsetX, offsetY } = fieldTransform(width, height);
  return territories.map((node) => ({
    ...node,
    x: offsetX + node.x * scale,
    y: offsetY + node.y * scale,
    radius: FIELD.radius * scale,
    fontSize: Math.max(14, 21 * scale),
  }));
}
