import type { Territory } from '@/game/types';

export const TERRITORIES: readonly Territory[] = [
  { id: 'north', owner: 'enemy', units: 36, x: 180, y: 40 },
  { id: 'north-west', owner: 'neutral', units: 8, x: 65, y: 100 },
  { id: 'north-east', owner: 'neutral', units: 12, x: 295, y: 100 },
  { id: 'upper-west', owner: 'neutral', units: 10, x: 115, y: 170 },
  { id: 'upper-east', owner: 'neutral', units: 10, x: 245, y: 170 },
  { id: 'west', owner: 'neutral', units: 8, x: 40, y: 240 },
  { id: 'centre', owner: 'neutral', units: 20, x: 180, y: 240 },
  { id: 'east', owner: 'neutral', units: 8, x: 320, y: 240 },
  { id: 'lower-west', owner: 'neutral', units: 10, x: 115, y: 310 },
  { id: 'lower-east', owner: 'neutral', units: 10, x: 245, y: 310 },
  { id: 'south-west', owner: 'neutral', units: 12, x: 65, y: 380 },
  { id: 'south-east', owner: 'neutral', units: 8, x: 295, y: 380 },
  { id: 'south', owner: 'player', units: 36, x: 180, y: 440 },
];
