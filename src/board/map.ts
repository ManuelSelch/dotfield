import type { Territory } from '../game/types';

// One fixed prototype map. Each new simulation copies these starting values.
export const TERRITORIES: readonly Territory[] = [
  { id: 'north', owner: 'enemy', units: 36, x: 180, y: 55 },
  { id: 'north-west', owner: 'neutral', units: 8, x: 76, y: 136 },
  { id: 'north-east', owner: 'neutral', units: 12, x: 282, y: 133 },
  { id: 'centre', owner: 'neutral', units: 20, x: 177, y: 229 },
  { id: 'south-west', owner: 'neutral', units: 12, x: 65, y: 308 },
  { id: 'south-east', owner: 'neutral', units: 8, x: 285, y: 309 },
  { id: 'south', owner: 'player', units: 36, x: 180, y: 425 },
];
