import { expect, it } from 'vitest';

import { hitTest } from './hit-test';
import { screenPoint } from './layout';
import { createRegionCache } from './regions/cache';
import { createCityRegions } from './regions/geometry';
import { RIVER_MAP } from './river-map';

it.each([
  [360, 480],
  [320, 600],
  [390, 480],
  [280, 340],
])('clips regions and whole-region input to their bank at %sx%s', (width, height) => {
  const { territories, river } = RIVER_MAP;
  const regions = createCityRegions(territories, width, height, river);
  const top = screenPoint({ x: 0, y: river.top }, width, height).y;
  const bottom = screenPoint({ x: 0, y: river.bottom }, width, height).y;
  for (const region of regions) {
    const city = territories.find((c) => c.id === region.id)!;
    for (const point of region.points)
      expect(city.y < river.top ? point.y <= top + 1e-7 : point.y >= bottom - 1e-7).toBe(true);
    expect(hitTest(territories, width, height, screenPoint(city, width, height), river)).toBe(
      city.id,
    );
  }
  for (const x of [1, 80, 180, 280, 359])
    expect(
      hitTest(territories, width, height, screenPoint({ x, y: 240 }, width, height), river),
    ).toBeNull();

  expect(hitTest(territories, width, height, { x: 1, y: 1 }, river)).not.toBeNull();
});

it('includes river geometry in the region cache without reacting to ownership or troop counts', () => {
  const { territories, river } = RIVER_MAP;
  const cache = createRegionCache();
  const dry = cache(territories, 360, 480);
  const wet = cache(territories, 360, 480, river);
  expect(wet).not.toBe(dry);
  expect(
    cache(
      territories.map((c) => ({ ...c, owner: 'player', units: 100 })),
      360,
      480,
      river,
    ),
  ).toBe(wet);
  expect(cache(territories, 360, 480, { ...river, top: 220 })).not.toBe(wet);
});
