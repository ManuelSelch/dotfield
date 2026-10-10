import { describe, expect, it } from 'vitest';
import { generateMap, DEFAULT_MAP_SETTINGS } from './generateMap';
import { canRiverOrder, createRiver } from '../game/river';
import { canDirectTerrainOrder } from '../game/terrain/directOrder';
import { TERRITORY_RADIUS } from '../game/settings';
import { compileRoundSetup } from '../game/upgrades/compile';

describe('generated fields', () => {
  it('reproduces the larger fourteen-city default field from settings and seed', () => {
    expect(DEFAULT_MAP_SETTINGS.cities).toBe(14);
    expect(generateMap(DEFAULT_MAP_SETTINGS, 42)).toEqual(generateMap(DEFAULT_MAP_SETTINGS, 42));
    expect(generateMap(DEFAULT_MAP_SETTINGS, 42).territories).not.toBe(generateMap(DEFAULT_MAP_SETTINGS, 42).territories);
    expect(generateMap(DEFAULT_MAP_SETTINGS, 43).territories).not.toEqual(generateMap(DEFAULT_MAP_SETTINGS, 42).territories);
  });
  it('combines a central mountain ridge with the optional river and keeps a legal city path around it', () => {
    const map = generateMap({ cities: 24, enemies: 1, industry: false, river: true }, 42);
    expect(map.terrain?.barriers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'mountain-range', kind: 'mountain', bounds: expect.any(Object) }),
    ]));
    expect(map.river?.bridges).toHaveLength(2);
    const mountain = map.terrain!.barriers.find(barrier => barrier.kind === 'mountain')!;
    expect(map.territories.every(city => city.x <= mountain.bounds.minX || city.x >= mountain.bounds.maxX
      || city.y <= mountain.bounds.minY || city.y >= mountain.bounds.maxY)).toBe(true);
    const west = map.territories.find(city => city.x < mountain.bounds.minX && city.y > mountain.bounds.minY && city.y < mountain.bounds.maxY)!;
    const east = map.territories.find(city => city.x > mountain.bounds.maxX && city.y > mountain.bounds.minY && city.y < mountain.bounds.maxY)!;
    expect(canDirectTerrainOrder(west, east, map.terrain)).toBe(false);
    const northBridge = map.territories.find(city => city.id === map.river!.bridges[0].northId)!;
    const southBridge = map.territories.find(city => city.id === map.river!.bridges[0].southId)!;
    expect(canRiverOrder(northBridge, southBridge, map.river)).toBe(true);
    const reachable = new Set([map.territories[0].id]);
    for (let pass = 0; pass < map.territories.length; pass++) for (const source of map.territories) if (reachable.has(source.id))
      for (const target of map.territories) if (canRiverOrder(source, target, map.river)
        && canDirectTerrainOrder(source, target, map.terrain)) reachable.add(target.id);
    expect(reachable.size).toBe(map.territories.length);
  });
  it('rejects invalid counts, flags and seeds rather than silently ignoring them', () => {
    for (const cities of [5, 25, 6.5, NaN]) expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, cities }, 1)).toThrow();
    for (const enemies of [0, 5, 1.5]) expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, enemies }, 1)).toThrow();
    expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, industry: 'on' as unknown as boolean }, 1)).toThrow();
    for (const seed of [-1, NaN, 1.5, 2 ** 32]) expect(() => generateMap(DEFAULT_MAP_SETTINGS, seed)).toThrow();
  });
  it('keeps city counts, distinct factions, clearance and legal connectivity for every supported combination', () => {
    for (let seed = 0; seed < 20; seed++) for (let cities = 6; cities <= 24; cities++)
      for (let enemies = 1; enemies <= 4; enemies++) for (const river of [false, true]) {
        const map = generateMap({ cities, enemies, river, industry: true }, seed);
        expect(map.territories).toHaveLength(cities);
        expect(new Set(map.territories.map(c => c.id)).size).toBe(cities);
        const starts = map.territories.filter(c => c.owner !== 'neutral');
        expect(starts).toHaveLength(enemies + 1);
        expect(new Set(starts.map(c => c.owner)).size).toBe(enemies + 1);
        expect(starts.every(c => c.units === 36)).toBe(true);
        expect(map.territories.some(c => c.owner === 'neutral' && c.features?.some(f => f.kind === 'factory'))).toBe(true);
        for (const c of map.territories) {
          expect(c.x).toBeGreaterThanOrEqual(TERRITORY_RADIUS);
          expect(c.x).toBeLessThanOrEqual(360 - TERRITORY_RADIUS);
          expect(c.y).toBeGreaterThanOrEqual(TERRITORY_RADIUS);
          expect(c.y).toBeLessThanOrEqual(480 - TERRITORY_RADIUS);
          for (const other of map.territories) if (c !== other) expect(Math.hypot(c.x - other.x, c.y - other.y)).toBeGreaterThanOrEqual(58);
        }
        const mountain = map.terrain?.barriers.find(barrier => barrier.kind === 'mountain');
        expect(mountain?.id).toBe('mountain-range');
        expect(map.territories.every(city => city.x <= mountain!.bounds.minX || city.x >= mountain!.bounds.maxX
          || city.y <= mountain!.bounds.minY || city.y >= mountain!.bounds.maxY)).toBe(true);
        if (river) {
          expect(map.river?.bridges).toHaveLength(2);
          expect(createRiver(map.river!, map.territories)).toEqual(map.river);
        } else expect(map.river).toBeUndefined();
        const reachable = new Set([map.territories[0].id]);
        for (let pass = 0; pass < cities; pass++) for (const source of map.territories) if (reachable.has(source.id))
          for (const target of map.territories) if (canRiverOrder(source, target, map.river)) reachable.add(target.id);
        expect(reachable.size).toBe(cities);
      }
  });
  it('keeps every generated city reachable by legal direct orders through mountain flanks and river bridges', () => {
    for (let seed = 0; seed < 8; seed++) for (const cities of [6, 12, 24]) for (const enemies of [1, 4])
      for (const river of [false, true]) {
        const map = generateMap({ cities, enemies, river, industry: false }, seed);
        const reachable = new Set([map.territories[0].id]);
        for (let pass = 0; pass < cities; pass++) for (const source of map.territories) if (reachable.has(source.id))
          for (const target of map.territories) if (canRiverOrder(source, target, map.river)
            && canDirectTerrainOrder(source, target, map.terrain)) reachable.add(target.id);
        expect(reachable.size, `seed ${seed}, cities ${cities}, enemies ${enemies}, river ${river}`).toBe(cities);
      }
  });
  it('does not add neutral industry when disabled and compiles all four independent enemy settings', () => {
    const map = generateMap({ cities: 24, enemies: 4, river: true, industry: false }, 4);
    expect(map.territories.every(c => !c.features?.length)).toBe(true);
    const setup = compileRoundSetup(map.territories, { player: ['industry'], enemy: ['factory'], 'enemy-4': ['watchtower'] }, undefined, 0, { 'enemy-4': 'defensive' }, map.river, map.terrain);
    expect(Object.keys(setup.ai)).toHaveLength(4);
    expect(setup.terrain).toEqual(map.terrain);
    expect(setup.territories.find(c => c.owner === 'enemy')?.features?.[0].kind).toBe('factory');
    expect(setup.territories.find(c => c.owner === 'enemy-4')?.features?.[0].kind).toBe('watchtower');
  });
});
