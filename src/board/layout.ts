import type { Territory } from '../game/types';

export const FIELD = { width: 360, height: 480, radius: 29 } as const;

export function projectBoard(territories: readonly Territory[], width: number, height: number) {
  const scale = Math.min(width / FIELD.width, height / FIELD.height);
  const offsetX = (width - FIELD.width * scale) / 2;
  const offsetY = (height - FIELD.height * scale) / 2;

  return territories.map((node) => ({
    ...node,
    x: offsetX + node.x * scale,
    y: offsetY + node.y * scale,
    radius: FIELD.radius * scale,
    fontSize: Math.max(14, 21 * scale),
  }));
}
