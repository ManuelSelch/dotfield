import { snapshotTerritories } from '../game/features/snapshot';
import { createTerrain } from '../game/terrain/terrain';

export const ARTILLERY_MAP = Object.freeze({
  id: 'siege',
  terrain: createTerrain({ bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 }, crossings: [], barriers: [] }),
  territories: snapshotTerritories([
    // First owned cities retain the existing spawn-upgrade placement contract.
    { id: 'north', owner: 'enemy', units: 36, x: 180, y: 50 },
    { id: 'south', owner: 'player', units: 36, x: 180, y: 430 },
    { id: 'west', owner: 'neutral', units: 8, x: 65, y: 125 },
    { id: 'east', owner: 'neutral', units: 8, x: 290, y: 125 },
    { id: 'near', owner: 'enemy', units: 12, x: 180, y: 170 },
    { id: 'blocked', owner: 'enemy', units: 12, x: 258, y: 215 },
    { id: 'artillery', owner: 'neutral', units: 14, x: 180, y: 240,
      features: [{ id: 'artillery:gun', kind: 'artillery', range: 110, fireIntervalMs: 2000 / 3 }] },
    { id: 'friendly', owner: 'player', units: 12, x: 112, y: 270 },
    { id: 'neutral', owner: 'neutral', units: 8, x: 245, y: 300 },
    { id: 'rear', owner: 'player', units: 12, x: 65, y: 370 },
    { id: 'flank', owner: 'neutral', units: 8, x: 290, y: 375 },
  ]),
});
