import { describe, expect, it } from 'vitest';
import { generateMap, DEFAULT_MAP_SETTINGS } from './generateMap';
import { canRiverOrder, createRiver } from '../game/river';
import { canDirectTerrainOrder } from '../game/terrain/directOrder';
import { TERRITORY_RADIUS } from '../game/settings';
import { compileRoundSetup } from '../game/upgrades/compile';

function everyCityReachable(map: ReturnType<typeof generateMap>) {
  const reachable = new Set([map.territories[0].id]);
  for (let pass = 0; pass < map.territories.length; pass++) for (const source of map.territories) if (reachable.has(source.id))
    for (const target of map.territories) if (canRiverOrder(source, target, map.river)
      && canDirectTerrainOrder(source, target, map.terrain)) reachable.add(target.id);
  return reachable.size === map.territories.length;
}

describe('generated fields', () => {
  it('reproduces the larger fourteen-city default field from settings and seed', () => {
    expect(DEFAULT_MAP_SETTINGS.cities).toBe(14);
    expect(DEFAULT_MAP_SETTINGS.mountains).toBe(true);
    expect(generateMap(DEFAULT_MAP_SETTINGS, 42)).toEqual(generateMap(DEFAULT_MAP_SETTINGS, 42));
    expect(generateMap(DEFAULT_MAP_SETTINGS, 42).territories).not.toBe(generateMap(DEFAULT_MAP_SETTINGS, 42).territories);
    expect(generateMap(DEFAULT_MAP_SETTINGS, 43).territories).not.toEqual(generateMap(DEFAULT_MAP_SETTINGS, 42).territories);
  });
  it('combines the mountain ridge with optional paired bridges and a legal staging path', () => {
    const map = generateMap({ ...DEFAULT_MAP_SETTINGS, cities: 24, enemies: 1, industry: false, river: true, mountains: true, artillery: false }, 42);
    const terrain = map.terrain!;
    expect(terrain.barriers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'mountain-range', kind: 'mountain', bounds: expect.any(Object) }),
    ]));
    expect(map.river?.bridges).toHaveLength(2);
    const mountain = terrain.barriers.find(barrier => barrier.id === 'mountain-range')!;
    expect(map.territories.every(city => city.x <= mountain.bounds.minX || city.x >= mountain.bounds.maxX
      || city.y <= mountain.bounds.minY || city.y >= mountain.bounds.maxY)).toBe(true);
    const west = map.territories.find(city => city.x < mountain.bounds.minX && city.y > mountain.bounds.minY && city.y < mountain.bounds.maxY)!;
    const east = map.territories.find(city => city.x > mountain.bounds.maxX && city.y > mountain.bounds.minY && city.y < mountain.bounds.maxY)!;
    expect(canDirectTerrainOrder(west, east, terrain)).toBe(false);
    const northBridge = map.territories.find(city => city.id === map.river!.bridges[0].northId)!;
    const southBridge = map.territories.find(city => city.id === map.river!.bridges[0].southId)!;
    expect(canRiverOrder(northBridge, southBridge, map.river)).toBe(true);
    expect(everyCityReachable(map)).toBe(true);
    expect(everyCityReachable(generateMap({ ...DEFAULT_MAP_SETTINGS, cities: 24, enemies: 1, industry: false, river: false, mountains: true, artillery: false }, 42))).toBe(true);
  });
  it('rejects invalid counts, flags and seeds rather than silently ignoring them', () => {
    for (const cities of [5, 25, 6.5, NaN]) expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, cities }, 1)).toThrow();
    for (const enemies of [0, 5, 1.5]) expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, enemies }, 1)).toThrow();
    expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, industry: 'on' as unknown as boolean }, 1)).toThrow();
    expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, mountains: 'on' as unknown as boolean }, 1)).toThrow();
    expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, artillery: 'on' as unknown as boolean }, 1)).toThrow();
    expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, watchtower: 'on' as unknown as boolean }, 1)).toThrow();
    expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, slowZone: 'on' as unknown as boolean }, 1)).toThrow();
    const { artillery: _omitted, ...missingArtillery } = DEFAULT_MAP_SETTINGS;
    expect(() => generateMap(missingArtillery as typeof DEFAULT_MAP_SETTINGS, 1)).toThrow();
    const { mountains: _missingMountains, ...missingMountains } = DEFAULT_MAP_SETTINGS;
    expect(() => generateMap(missingMountains as typeof DEFAULT_MAP_SETTINGS, 1)).toThrow();
    for (const seed of [-1, NaN, 1.5, 2 ** 32]) expect(() => generateMap(DEFAULT_MAP_SETTINGS, seed)).toThrow();
  });
  it.each([false, true])('keeps city counts, clearance and bridges valid across maps with Mountains %s', mountains => {
    for (let seed = 0; seed < 20; seed++) for (let cities = 6; cities <= 24; cities++)
      for (let enemies = 1; enemies <= 4; enemies++) for (const river of [false, true]) {
        const map = generateMap({ ...DEFAULT_MAP_SETTINGS, cities, enemies, river, industry: true, mountains, artillery: false, watchtower: false, slowZone: false }, seed);
        expect(map.territories).toHaveLength(cities);
        expect(new Set(map.territories.map(c => c.id)).size).toBe(cities);
        const starts = map.territories.filter(c => c.owner !== 'neutral');
        expect(starts).toHaveLength(enemies + 1);
        expect(new Set(starts.map(c => c.owner)).size).toBe(enemies + 1);
        expect(starts.every(c => c.units === 36)).toBe(true);
        expect(map.territories.some(c => c.owner === 'neutral' && c.features?.some(f => f.kind === 'factory'))).toBe(true);
        for (const city of map.territories) {
          expect(city.x).toBeGreaterThanOrEqual(TERRITORY_RADIUS);
          expect(city.x).toBeLessThanOrEqual(360 - TERRITORY_RADIUS);
          expect(city.y).toBeGreaterThanOrEqual(TERRITORY_RADIUS);
          expect(city.y).toBeLessThanOrEqual(480 - TERRITORY_RADIUS);
          for (const other of map.territories) if (city !== other) expect(Math.hypot(city.x - other.x, city.y - other.y)).toBeGreaterThanOrEqual(58);
        }
        const mountain = map.terrain?.barriers.find(barrier => barrier.id === 'mountain-range');
        expect(mountain !== undefined).toBe(mountains);
        if (mountain) expect(map.territories.every(city => city.x <= mountain.bounds.minX || city.x >= mountain.bounds.maxX
          || city.y <= mountain.bounds.minY || city.y >= mountain.bounds.maxY)).toBe(true);
        if (river) {
          expect(map.river?.bridges).toHaveLength(2);
          expect(createRiver(map.river!, map.territories)).toEqual(map.river);
        } else expect(map.river).toBeUndefined();
      }
  });
  it('places one seeded-random Watchtower and Slow Zone only when selected', () => {
    const settings = { ...DEFAULT_MAP_SETTINGS, watchtower: true, slowZone: true };
    const map = generateMap(settings, 19);
    const towers = map.territories.filter(city => city.features?.some(feature => feature.kind === 'watchtower'));
    expect(towers).toHaveLength(1);
    const zones = map.territories.filter(city => city.features?.some(feature => feature.kind === 'slow-zone'));
    expect(zones).toHaveLength(1);
    expect(zones[0].features).toContainEqual({ id: `${zones[0].id}:slow-zone`, kind: 'slow-zone', radius: 150, speedMultiplier: 0.5 });
    expect(generateMap(settings, 19)).toEqual(map);
    const placements = Array.from({ length: 20 }, (_, seed) => generateMap({ ...DEFAULT_MAP_SETTINGS, watchtower: true }, seed)
      .territories.find(city => city.features?.some(feature => feature.kind === 'watchtower'))!);
    expect(new Set(placements.map(city => city.id)).size).toBeGreaterThan(1);
    expect(placements.some(city => city.owner === 'neutral')).toBe(true);
    const disabled = generateMap({ ...settings, watchtower: false, slowZone: false }, 19);
    expect(disabled.territories.every(city => !city.features?.some(feature => feature.kind === 'watchtower' || feature.kind === 'slow-zone'))).toBe(true);
  });
  it('keeps Slow Zone when generated features share a city', () => {
    const settings = { ...DEFAULT_MAP_SETTINGS, artillery: true, watchtower: true, slowZone: true, industry: true };
    for (let seed = 0; seed < 20; seed++) {
      const map = generateMap(settings, seed);
      expect(map.territories.flatMap(city => city.features ?? []).filter(feature => feature.kind === 'watchtower')).toHaveLength(1);
      expect(map.territories.flatMap(city => city.features ?? []).filter(feature => feature.kind === 'slow-zone')).toHaveLength(1);
      expect(map.territories.flatMap(city => city.features ?? []).filter(feature => feature.kind === 'artillery')).toHaveLength(1);
    }
  });
  it.each([false, true])('keeps every city reachable with Mountains %s', mountains => {
    for (let seed = 0; seed < 4; seed++) for (const cities of [6, 12, 24]) for (const enemies of [1, 4])
      for (const river of [false, true]) {
        const map = generateMap({ ...DEFAULT_MAP_SETTINGS, cities, enemies, river, mountains, industry: false, artillery: false }, seed);
        expect(everyCityReachable(map), `seed ${seed}, cities ${cities}, enemies ${enemies}, river ${river}, mountains ${mountains}`).toBe(true);
      }
  });
  it('adds one neutral Artillery city and a separate ridge only when selected', () => {
    for (const industry of [false, true]) {
      const settings = { ...DEFAULT_MAP_SETTINGS, cities: 12, enemies: 2, river: true, mountains: true, industry, artillery: true };
      const map = generateMap(settings, 19);
      expect(map.settings.artillery).toBe(true);
      const guns = map.territories.flatMap(city => (city.features ?? []).filter(feature => feature.kind === 'artillery').map(() => city));
      expect(guns).toHaveLength(1);
      expect(guns[0]).toMatchObject({ owner: 'neutral', units: 14 });
      expect(guns[0].features?.some(feature => feature.kind === 'factory')).toBe(false);
      expect(map.terrain?.barriers.map(barrier => barrier.id)).toEqual(['mountain-range']);
      expect(generateMap(settings, 19)).toEqual(map);
    }
    const disabled = generateMap({ ...DEFAULT_MAP_SETTINGS, artillery: false }, 19);
    expect(disabled.settings.artillery).toBe(false);
    expect(disabled.terrain?.barriers.map(barrier => barrier.id)).toEqual(['mountain-range']);
    expect(disabled.territories.every(city => !city.features?.some(feature => feature.kind === 'artillery'))).toBe(true);
  });
  it('keeps Artillery placement, terrain and city clearance valid across generated sizes and bridge modes', () => {
    for (let seed = 0; seed < 3; seed++) for (let cities = 6; cities <= 24; cities++)
      for (let enemies = 1; enemies <= 4; enemies++) for (const river of [false, true]) {
        const map = generateMap({ ...DEFAULT_MAP_SETTINGS, cities, enemies, river, mountains: true, industry: seed % 2 === 0, artillery: true }, seed);
        const guns = map.territories.filter(city => city.features?.some(feature => feature.kind === 'artillery'));
        expect(guns).toHaveLength(1);
        expect(guns[0].owner).toBe('neutral');
        expect(guns[0].units).toBe(14);
        expect(map.terrain?.barriers.map(barrier => barrier.id)).toEqual(['mountain-range']);
      }
  });
  it('compiles mountain terrain together with independent faction settings', () => {
    const map = generateMap({ ...DEFAULT_MAP_SETTINGS, cities: 24, enemies: 4, river: true, mountains: true, industry: false, artillery: false }, 4);
    expect(map.territories.every(c => !c.features?.length)).toBe(true);
    const setup = compileRoundSetup(map.territories, { player: ['industry'], enemy: ['factory'] }, undefined, { 'enemy-4': 'defensive' }, map.river, map.terrain);
    expect(Object.keys(setup.ai)).toHaveLength(4);
    expect(setup.terrain).toEqual(map.terrain);
    expect(setup.territories.find(c => c.owner === 'enemy')?.features?.[0].kind).toBe('factory');
    expect(setup.territories.find(c => c.owner === 'enemy-4')?.features).toBeUndefined();
  });
});
