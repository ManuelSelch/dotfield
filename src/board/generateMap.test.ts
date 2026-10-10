import { describe, expect, it } from 'vitest';
import { generateMap, DEFAULT_MAP_SETTINGS } from './generateMap';
import { canRiverOrder, createRiver } from '../game/river';
import { TERRITORY_RADIUS } from '../game/settings';
import { compileRoundSetup } from '../game/upgrades/compile';

describe('generated fields', () => {
  it('reproduces the exact field from settings and seed, without shared mutable cities', () => {
    expect(generateMap(DEFAULT_MAP_SETTINGS, 42)).toEqual(generateMap(DEFAULT_MAP_SETTINGS, 42));
    expect(generateMap(DEFAULT_MAP_SETTINGS, 42).territories).not.toBe(generateMap(DEFAULT_MAP_SETTINGS, 42).territories);
    expect(generateMap(DEFAULT_MAP_SETTINGS, 43).territories).not.toEqual(generateMap(DEFAULT_MAP_SETTINGS, 42).territories);
  });
  it('rejects invalid counts, flags and seeds rather than silently ignoring them', () => {
    for (const cities of [5, 25, 6.5, NaN]) expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, cities }, 1)).toThrow();
    for (const enemies of [0, 5, 1.5]) expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, enemies }, 1)).toThrow();
    expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, industry: 'on' as unknown as boolean }, 1)).toThrow();
    expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, artillery: 'on' as unknown as boolean }, 1)).toThrow();
    const { artillery: _omitted, ...missingArtillery } = DEFAULT_MAP_SETTINGS;
    expect(() => generateMap(missingArtillery as typeof DEFAULT_MAP_SETTINGS, 1)).toThrow();
    for (const seed of [-1, NaN, 1.5, 2 ** 32]) expect(() => generateMap(DEFAULT_MAP_SETTINGS, seed)).toThrow();
  });
  it('keeps city counts, distinct factions, clearance and legal connectivity for every supported combination', () => {
    for (let seed = 0; seed < 20; seed++) for (let cities = 6; cities <= 24; cities++)
      for (let enemies = 1; enemies <= 4; enemies++) for (const river of [false, true]) {
        const map = generateMap({ cities, enemies, river, industry: true, artillery: false }, seed);
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
  it('adds one neutral Artillery city and validated mountain terrain only when selected', () => {
    for (const industry of [false, true]) {
      const settings = { cities: 12, enemies: 2, river: true, industry, artillery: true };
      const map = generateMap(settings, 19);
      expect(map.settings.artillery).toBe(true);
      const guns = map.territories.flatMap(city => (city.features ?? []).filter(feature => feature.kind === 'artillery').map(() => city));
      expect(guns).toHaveLength(1);
      expect(guns[0]).toMatchObject({ owner: 'neutral', units: 14 });
      expect(guns[0].features?.some(feature => feature.kind === 'factory')).toBe(false);
      expect(map.terrain?.barriers).toHaveLength(1);
      expect(map.terrain?.barriers[0].kind).toBe('mountain');
      expect(generateMap(settings, 19)).toEqual(map);
    }
    const disabled = generateMap({ ...DEFAULT_MAP_SETTINGS, artillery: false }, 19);
    expect(disabled.settings.artillery).toBe(false);
    expect(disabled.terrain).toBeUndefined();
    expect(disabled.territories.every(city => !city.features?.some(feature => feature.kind === 'artillery'))).toBe(true);
  });
  it('places valid contested Artillery and an unobstructed mountain across generated sizes and bridge modes', () => {
    for (let seed = 0; seed < 3; seed++) for (let cities = 6; cities <= 24; cities++)
      for (let enemies = 1; enemies <= 4; enemies++) for (const river of [false, true]) {
        const map = generateMap({ cities, enemies, river, industry: seed % 2 === 0, artillery: true }, seed);
        const guns = map.territories.filter(city => city.features?.some(feature => feature.kind === 'artillery'));
        expect(guns).toHaveLength(1);
        expect(guns[0].owner).toBe('neutral');
        expect(guns[0].units).toBe(14);
        expect(map.terrain?.barriers).toHaveLength(1);
        expect(map.terrain?.barriers[0].kind).toBe('mountain');
      }
  });
  it('does not add neutral industry when disabled and compiles all four independent enemy settings', () => {
    const map = generateMap({ cities: 24, enemies: 4, river: true, industry: false, artillery: false }, 4);
    expect(map.territories.every(c => !c.features?.length)).toBe(true);
    const setup = compileRoundSetup(map.territories, { player: ['industry'], enemy: ['factory'], 'enemy-4': ['watchtower'] }, undefined, 0, { 'enemy-4': 'defensive' }, map.river);
    expect(Object.keys(setup.ai)).toHaveLength(4);
    expect(setup.territories.find(c => c.owner === 'enemy')?.features?.[0].kind).toBe('factory');
    expect(setup.territories.find(c => c.owner === 'enemy-4')?.features?.[0].kind).toBe('watchtower');
  });
});
