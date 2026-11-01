import { describe, expect, it } from 'vitest';

import { canRiverOrder, createRiver } from '@/game/river';
import { TERRITORY_RADIUS } from '@/game/settings';
import { canDirectTerrainOrder } from '@/game/terrain/direct-order';
import { compileRoundSetup } from '@/game/upgrades/compile';

import { generateMap, DEFAULT_MAP_SETTINGS } from './generate-map';

function everyCityReachable(map: ReturnType<typeof generateMap>) {
  const reachable = new Set([map.territories[0].id]);
  for (let pass = 0; pass < map.territories.length; pass++)
    for (const source of map.territories)
      if (reachable.has(source.id))
        for (const target of map.territories)
          if (
            canRiverOrder(source, target, map.river) &&
            canDirectTerrainOrder(source, target, map.terrain)
          )
            reachable.add(target.id);
  return reachable.size === map.territories.length;
}

describe('generated fields', () => {
  it('reproduces the larger fourteen-city default field from settings and seed', () => {
    expect(DEFAULT_MAP_SETTINGS.cities).toBe(14);
    expect(DEFAULT_MAP_SETTINGS.mountains).toBe(true);
    expect(generateMap(DEFAULT_MAP_SETTINGS, 42)).toEqual(generateMap(DEFAULT_MAP_SETTINGS, 42));
    expect(generateMap(DEFAULT_MAP_SETTINGS, 42).territories).not.toBe(
      generateMap(DEFAULT_MAP_SETTINGS, 42).territories,
    );
    expect(generateMap(DEFAULT_MAP_SETTINGS, 43).territories).not.toEqual(
      generateMap(DEFAULT_MAP_SETTINGS, 42).territories,
    );
  });
  it('combines the mountain ridge with optional paired bridges and a legal staging path', () => {
    const map = generateMap(
      {
        ...DEFAULT_MAP_SETTINGS,
        cities: 30,
        enemies: 1,
        industry: false,
        river: true,
        mountains: true,
        artillery: false,
      },
      42,
    );
    const terrain = map.terrain!;
    expect(terrain.barriers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'mountain-range',
          kind: 'mountain',
          bounds: expect.any(Object),
        }),
      ]),
    );
    expect(map.river?.bridges).toHaveLength(2);
    const mountain = terrain.barriers.find((barrier) => barrier.id === 'mountain-range')!;
    expect(
      map.territories.every(
        (city) =>
          city.x <= mountain.bounds.minX ||
          city.x >= mountain.bounds.maxX ||
          city.y <= mountain.bounds.minY ||
          city.y >= mountain.bounds.maxY,
      ),
    ).toBe(true);
    const west = map.territories.find(
      (city) =>
        city.x < mountain.bounds.minX &&
        city.y > mountain.bounds.minY &&
        city.y < mountain.bounds.maxY,
    )!;
    const east = map.territories.find(
      (city) =>
        city.x > mountain.bounds.maxX &&
        city.y > mountain.bounds.minY &&
        city.y < mountain.bounds.maxY,
    )!;
    expect(canDirectTerrainOrder(west, east, terrain)).toBe(false);
    const northBridge = map.territories.find((city) => city.id === map.river!.bridges[0].northId)!;
    const southBridge = map.territories.find((city) => city.id === map.river!.bridges[0].southId)!;
    expect(canRiverOrder(northBridge, southBridge, map.river)).toBe(true);
    expect(everyCityReachable(map)).toBe(true);
    expect(
      everyCityReachable(
        generateMap(
          {
            ...DEFAULT_MAP_SETTINGS,
            cities: 30,
            enemies: 1,
            industry: false,
            river: false,
            mountains: true,
            artillery: false,
          },
          42,
        ),
      ),
    ).toBe(true);
  });
  it('rejects invalid counts, flags and seeds rather than silently ignoring them', () => {
    for (const cities of [5, 31, 6.5, NaN])
      expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, cities }, 1)).toThrow();
    for (const enemies of [0, 5, 1.5])
      expect(() => generateMap({ ...DEFAULT_MAP_SETTINGS, enemies }, 1)).toThrow();
    expect(() =>
      generateMap({ ...DEFAULT_MAP_SETTINGS, industry: 'on' as unknown as boolean }, 1),
    ).toThrow();
    expect(() =>
      generateMap({ ...DEFAULT_MAP_SETTINGS, mountains: 'on' as unknown as boolean }, 1),
    ).toThrow();
    expect(() =>
      generateMap({ ...DEFAULT_MAP_SETTINGS, artillery: 'on' as unknown as boolean }, 1),
    ).toThrow();
    expect(() =>
      generateMap({ ...DEFAULT_MAP_SETTINGS, watchtower: 'on' as unknown as boolean }, 1),
    ).toThrow();
    expect(() =>
      generateMap({ ...DEFAULT_MAP_SETTINGS, slowZone: 'on' as unknown as boolean }, 1),
    ).toThrow();
    const legacy = generateMap({ ...DEFAULT_MAP_SETTINGS, artillery: true, watchtower: true }, 1);
    expect(
      legacy.territories.every(
        (city) =>
          city.cityType !== 'artillery' &&
          city.cityType !== 'watchtower' &&
          !city.features?.some(
            (feature) => feature.kind === 'artillery' || feature.kind === 'watchtower',
          ),
      ),
    ).toBe(true);
    const { mountains: _missingMountains, ...missingMountains } = DEFAULT_MAP_SETTINGS;
    expect(() => generateMap(missingMountains as typeof DEFAULT_MAP_SETTINGS, 1)).toThrow();
    for (const seed of [-1, NaN, 1.5, 2 ** 32])
      expect(() => generateMap(DEFAULT_MAP_SETTINGS, seed)).toThrow();
  });
  it.each([false, true])(
    'keeps city counts, clearance and bridges valid across maps with Mountains %s',
    (mountains) => {
      for (let seed = 0; seed < 20; seed++)
        for (let cities = 6; cities <= 30; cities++)
          for (let enemies = 1; enemies <= 4; enemies++)
            for (const river of [false, true]) {
              const map = generateMap(
                {
                  ...DEFAULT_MAP_SETTINGS,
                  cities,
                  enemies,
                  river,
                  industry: true,
                  mountains,
                  artillery: false,
                  watchtower: false,
                  slowZone: false,
                },
                seed,
              );
              expect(map.territories).toHaveLength(cities);
              expect(new Set(map.territories.map((c) => c.id)).size).toBe(cities);
              const starts = map.territories.filter((c) => c.owner !== 'neutral');
              expect(starts).toHaveLength(enemies + 1);
              expect(new Set(starts.map((c) => c.owner)).size).toBe(enemies + 1);
              expect(starts.every((c) => c.units === 36)).toBe(true);
              expect(
                map.territories.some(
                  (c) => c.owner === 'neutral' && c.features?.some((f) => f.kind === 'factory'),
                ),
              ).toBe(true);
              for (const city of map.territories) {
                expect(city.x).toBeGreaterThanOrEqual(TERRITORY_RADIUS);
                expect(city.x).toBeLessThanOrEqual(360 - TERRITORY_RADIUS);
                expect(city.y).toBeGreaterThanOrEqual(TERRITORY_RADIUS);
                expect(city.y).toBeLessThanOrEqual(480 - TERRITORY_RADIUS);
                for (const other of map.territories)
                  if (city !== other)
                    expect(Math.hypot(city.x - other.x, city.y - other.y)).toBeGreaterThanOrEqual(
                      35,
                    );
              }
              const mountain = map.terrain?.barriers.find(
                (barrier) => barrier.id === 'mountain-range',
              );
              expect(mountain !== undefined).toBe(mountains);
              if (mountain)
                expect(
                  map.territories.every(
                    (city) =>
                      city.x <= mountain.bounds.minX ||
                      city.x >= mountain.bounds.maxX ||
                      city.y <= mountain.bounds.minY ||
                      city.y >= mountain.bounds.maxY,
                  ),
                ).toBe(true);
              if (river) {
                expect(map.river?.bridges).toHaveLength(2);
                expect(createRiver(map.river!, map.territories)).toEqual(map.river);
              } else expect(map.river).toBeUndefined();
            }
    },
    30_000,
  );
  it('migrates Home weapon toggles out while preserving Slow Zone generation', () => {
    const settings = { ...DEFAULT_MAP_SETTINGS, artillery: true, watchtower: true, slowZone: true };
    const map = generateMap(settings, 19);
    expect(
      map.territories.every(
        (city) =>
          city.cityType !== 'artillery' &&
          city.cityType !== 'watchtower' &&
          !city.features?.some(
            (feature) => feature.kind === 'artillery' || feature.kind === 'watchtower',
          ),
      ),
    ).toBe(true);
    const zones = map.territories.filter((city) =>
      city.features?.some((feature) => feature.kind === 'slow-zone'),
    );
    expect(zones).toHaveLength(1);
    expect(generateMap(settings, 19)).toEqual(map);
    const disabled = generateMap({ ...settings, slowZone: false }, 19);
    expect(
      disabled.territories.every(
        (city) => !city.features?.some((feature) => feature.kind === 'slow-zone'),
      ),
    ).toBe(true);
  });
  it('keeps Slow Zone and Factory generation independent of legacy weapon toggles', () => {
    const settings = {
      ...DEFAULT_MAP_SETTINGS,
      artillery: true,
      watchtower: true,
      slowZone: true,
      industry: true,
    };
    for (let seed = 0; seed < 20; seed++) {
      const map = generateMap(settings, seed);
      expect(
        map.territories
          .flatMap((city) => city.features ?? [])
          .filter((feature) => feature.kind === 'watchtower'),
      ).toHaveLength(0);
      expect(
        map.territories
          .flatMap((city) => city.features ?? [])
          .filter((feature) => feature.kind === 'slow-zone'),
      ).toHaveLength(1);
      expect(
        map.territories
          .flatMap((city) => city.features ?? [])
          .filter((feature) => feature.kind === 'artillery'),
      ).toHaveLength(0);
    }
  });
  it.each([false, true])(
    'keeps every city reachable with Mountains %s',
    (mountains) => {
      for (let seed = 0; seed < 4; seed++)
        for (const cities of [6, 12, 24])
          for (const enemies of [1, 4])
            for (const river of [false, true]) {
              const map = generateMap(
                {
                  ...DEFAULT_MAP_SETTINGS,
                  cities,
                  enemies,
                  river,
                  mountains,
                  industry: false,
                  artillery: false,
                },
                seed,
              );
              expect(
                everyCityReachable(map),
                `seed ${seed}, cities ${cities}, enemies ${enemies}, river ${river}, mountains ${mountains}`,
              ).toBe(true);
            }
    },
    30_000,
  );
  it('does not spawn prebuilt Artillery from deprecated generated-map settings', () => {
    const map = generateMap(
      {
        ...DEFAULT_MAP_SETTINGS,
        cities: 12,
        enemies: 2,
        river: true,
        mountains: true,
        industry: true,
        artillery: true,
      },
      19,
    );
    expect(map.terrain?.barriers.map((barrier) => barrier.id)).toEqual(['mountain-range']);
    expect(
      map.territories.every(
        (city) =>
          city.cityType !== 'artillery' &&
          !city.features?.some((feature) => feature.kind === 'artillery'),
      ),
    ).toBe(true);
    expect(
      map.territories.filter((city) =>
        city.features?.some((feature) => feature.kind === 'factory'),
      ),
    ).toHaveLength(2);
  });
  it('keeps generated terrain/city clearance independent of deprecated weapon toggles', () => {
    for (let seed = 0; seed < 3; seed++)
      for (let cities = 6; cities <= 30; cities++)
        for (let enemies = 1; enemies <= 4; enemies++)
          for (const river of [false, true]) {
            const map = generateMap(
              {
                ...DEFAULT_MAP_SETTINGS,
                cities,
                enemies,
                river,
                mountains: true,
                industry: seed % 2 === 0,
                artillery: true,
                watchtower: true,
              },
              seed,
            );
            expect(
              map.territories.some(
                (city) => city.cityType === 'artillery' || city.cityType === 'watchtower',
              ),
            ).toBe(false);
            expect(
              map.territories
                .flatMap((city) => city.features ?? [])
                .some((feature) => feature.kind === 'artillery' || feature.kind === 'watchtower'),
            ).toBe(false);
            expect(map.terrain?.barriers.map((barrier) => barrier.id)).toEqual(['mountain-range']);
          }
  });
  it('compiles mountain terrain together with independent faction settings', () => {
    const map = generateMap(
      {
        ...DEFAULT_MAP_SETTINGS,
        cities: 30,
        enemies: 4,
        river: true,
        mountains: true,
        industry: false,
        artillery: false,
      },
      4,
    );
    expect(map.territories.every((c) => !c.features?.length)).toBe(true);
    const setup = compileRoundSetup(
      map.territories,
      { player: ['industry'], enemy: ['factory'] },
      undefined,
      { 'enemy-4': 'defensive' },
      map.river,
      map.terrain,
    );
    expect(Object.keys(setup.ai)).toHaveLength(4);
    expect(setup.terrain).toEqual(map.terrain);
    expect(setup.territories.find((c) => c.owner === 'enemy')?.features?.[0].kind).toBe('factory');
    expect(setup.territories.find((c) => c.owner === 'enemy-4')?.features).toBeUndefined();
  });
});
