import { describe, expect, it } from 'vitest';
import { createRiver } from './river';
import { createTerrain } from './terrain/terrain';
import { createSimulation } from './state';
import { groundOrderBlockReason, canGroundOrder } from './groundAccess';
import type { Territory } from './types';

const city = (id: string, owner: string, x: number, y: number, cityType?: Territory['cityType']): Territory =>
  ({ id, owner, units: 20, x, y, cityType });

describe('ground-order explanation', () => {
  it('identifies river, terrain and Defender blockers and agrees with legality', () => {
    const riverCities = [city('north', 'enemy', 60, 190), city('south', 'neutral', 60, 290), city('bridge-n', 'neutral', 280, 190), city('bridge-s', 'neutral', 280, 290)];
    const river = createRiver({ top: 225, bottom: 255, bridges: [{ id: 'bridge', northId: 'bridge-n', southId: 'bridge-s', width: 64 }] }, riverCities);
    const riverState = createSimulation(riverCities, undefined, river);
    expect(groundOrderBlockReason(riverState, riverCities[0], riverCities[1])).toEqual({ reason: 'river' });
    expect(canGroundOrder(riverState, riverCities[0], riverCities[1])).toBe(false);

    const mountainCities = [city('enemy', 'enemy', 60, 240), city('target', 'neutral', 300, 240)];
    const terrain = createTerrain({ bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 }, crossings: [],
      barriers: [{ id: 'ridge', kind: 'mountain', bounds: { minX: 160, minY: 200, maxX: 200, maxY: 280 } }] });
    const terrainState = createSimulation(mountainCities, undefined, undefined, terrain);
    expect(groundOrderBlockReason(terrainState, mountainCities[0], mountainCities[1])).toEqual({ reason: 'terrain' });
    expect(canGroundOrder(terrainState, mountainCities[0], mountainCities[1])).toBe(false);

    const defenderCities = [city('enemy', 'enemy', 60, 240), city('wall', 'player', 180, 240, 'defender'), city('target', 'neutral', 300, 240)];
    const defenderState = createSimulation(defenderCities);
    expect(groundOrderBlockReason(defenderState, defenderCities[0], defenderCities[2])).toEqual({ reason: 'defender', blockerId: 'wall' });
    expect(canGroundOrder(defenderState, defenderCities[0], defenderCities[2])).toBe(false);
  });

  it('identifies self-targets and returns null for legal orders', () => {
    const cities = [city('source', 'enemy', 60, 240), city('target', 'neutral', 120, 240)];
    const state = createSimulation(cities);
    expect(groundOrderBlockReason(state, cities[0], cities[0])).toEqual({ reason: 'same-city' });
    expect(groundOrderBlockReason(state, cities[0], cities[1])).toBeNull();
    expect(canGroundOrder(state, cities[0], cities[1])).toBe(true);
  });
});
