import { snapshotTerritories } from '@/game/features/snapshot';
import { createRiver } from '@/game/river';

// The neutral Factory is a bridge endpoint: both 36-unit spawns have a legal
// 100-unit opening attack, one along its bank and one over the open bridge.
// The eastern bridge is an alternative flank, not an ownership-locked crossing.
const territories = snapshotTerritories([
  { id: 'north', x: 80, y: 90, owner: 'enemy', units: 36 },
  { id: 'south', x: 80, y: 290, owner: 'player', units: 36 },
  { id: 'north-east', x: 280, y: 90, owner: 'neutral', units: 8 },
  {
    id: 'west-north',
    x: 80,
    y: 190,
    owner: 'neutral',
    units: 14,
    features: [{ id: 'west-north:factory', kind: 'factory', productionMultiplier: 2 }],
  },
  { id: 'east-north', x: 280, y: 190, owner: 'neutral', units: 8 },
  { id: 'east-south', x: 280, y: 290, owner: 'neutral', units: 8 },
  { id: 'south-west', x: 80, y: 390, owner: 'neutral', units: 8 },
  { id: 'south-east', x: 280, y: 390, owner: 'neutral', units: 8 },
]);

export const FACTORY_MAP = Object.freeze({
  id: 'foundry',
  territories,
  river: createRiver(
    {
      top: 225,
      bottom: 255,
      bridges: [
        { id: 'west', northId: 'west-north', southId: 'south', width: 64 },
        { id: 'east', northId: 'east-north', southId: 'east-south', width: 64 },
      ],
    },
    territories,
  ),
});
