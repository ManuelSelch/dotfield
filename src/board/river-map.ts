import { createRiver } from '@/game/river';
import type { Territory } from '@/game/types';

const territories: readonly Territory[] = Object.freeze([
  { id: 'north', x: 180, y: 50, owner: 'enemy', units: 36 },
  // First owned city is the existing upgrade compiler's spawn-city contract.
  { id: 'south', x: 180, y: 430, owner: 'player', units: 36 },
  { id: 'north-west', x: 70, y: 120, owner: 'neutral', units: 8 },
  { id: 'north-east', x: 290, y: 120, owner: 'enemy', units: 12 },
  { id: 'west-north', x: 80, y: 190, owner: 'neutral', units: 8 },
  { id: 'east-north', x: 280, y: 190, owner: 'neutral', units: 8 },
  { id: 'west-south', x: 80, y: 290, owner: 'player', units: 18 },
  { id: 'east-south', x: 280, y: 290, owner: 'neutral', units: 8 },
  { id: 'south-west', x: 70, y: 360, owner: 'neutral', units: 8 },
  { id: 'south-east', x: 290, y: 360, owner: 'neutral', units: 8 },
] satisfies Territory[]);

export const RIVER_MAP = Object.freeze({
  id: 'bridges',
  territories,
  river: createRiver(
    {
      top: 225,
      bottom: 255,
      bridges: [
        { id: 'west', northId: 'west-north', southId: 'west-south', width: 64 },
        { id: 'east', northId: 'east-north', southId: 'east-south', width: 64 },
      ],
    },
    territories,
  ),
});
