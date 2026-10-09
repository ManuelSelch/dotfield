export type Owner = 'player' | 'enemy' | 'neutral';

export interface Territory {
  readonly id: string;
  readonly owner: Owner;
  readonly units: number;
  readonly x: number;
  readonly y: number;
}

export const FIELD = { width: 360, height: 480, radius: 29 } as const;

// A fixed preview map, not simulation state. Growth and orders come later.
export const TERRITORIES: readonly Territory[] = [
  { id: 'north', owner: 'enemy', units: 36, x: 180, y: 55 },
  { id: 'north-west', owner: 'neutral', units: 8, x: 76, y: 136 },
  { id: 'north-east', owner: 'neutral', units: 12, x: 282, y: 133 },
  { id: 'centre', owner: 'neutral', units: 20, x: 177, y: 229 },
  { id: 'south-west', owner: 'neutral', units: 12, x: 65, y: 308 },
  { id: 'south-east', owner: 'neutral', units: 8, x: 285, y: 309 },
  { id: 'south', owner: 'player', units: 36, x: 180, y: 425 },
];

export function projectBoard(width: number, height: number) {
  const scale = Math.min(width / FIELD.width, height / FIELD.height);
  const offsetX = (width - FIELD.width * scale) / 2;
  const offsetY = (height - FIELD.height * scale) / 2;

  return TERRITORIES.map((node) => ({
    ...node,
    x: offsetX + node.x * scale,
    y: offsetY + node.y * scale,
    radius: FIELD.radius * scale,
    fontSize: Math.max(14, 21 * scale),
  }));
}
