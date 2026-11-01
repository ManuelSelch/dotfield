import { expect, it } from 'vitest';

import { DEFAULT_MAP_SETTINGS, generateMap } from '@/board/generate-map';

import { convertCity } from './city-conversion';
import { firstDefenderBlocker } from './defender-borders';
import { canGroundOrder } from './ground-access';
import { createSimulation } from './state';

it('a built western pass Defender blocks the actual Courtyard southern cross-corridor without closing attacks on itself', () => {
  const map = generateMap(
    { ...DEFAULT_MAP_SETTINGS, layout: 'courtyard', cities: 30, enemies: 1 },
    42,
  );
  const state = createSimulation(
    map.territories.map((c) => ({ ...c, units: 50, owner: c.x < 180 ? 'player' : 'enemy' })),
    { unitsPerSecond: 0 },
    map.river,
    map.terrain,
  );
  const source = state.territories.find((c) => c.id === 'expansion-160-445-east')!;
  const wall = state.territories.find((c) => c.id === 'expansion-160-445-west')!;
  const behind = state.territories.find((c) => c.id === 'bridge-south-west')!;
  expect(canGroundOrder(state, source, behind)).toBe(true);
  const built = convertCity(state, wall.id, 'defender');
  expect(built).not.toBe(state);
  expect(canGroundOrder(built, source, behind)).toBe(false);
  expect(firstDefenderBlocker(built.territories, source, behind, built.river)?.id).toBe(wall.id);
  expect(canGroundOrder(built, source, wall)).toBe(true);
  // No map recipe, region topology, or resource advantage is introduced.
  expect(built.terrain).toBe(state.terrain);
  expect(built.river).toBe(state.river);
  expect(built.territories.find((c) => c.id === wall.id)!.units).toBe(30);
});
