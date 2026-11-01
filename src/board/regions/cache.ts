import type { River } from '@/game/river';
import type { Territory } from '@/game/types';

import { createCityRegions, type CityRegion } from './geometry';

export function createRegionCache(generate = createCityRegions) {
  let key = '';
  let regions: readonly CityRegion[] = [];
  return (territories: readonly Territory[], width: number, height: number, river?: River) => {
    const nextKey = JSON.stringify([
      width,
      height,
      river,
      territories.map((n) => [n.id, n.x, n.y]),
    ]);
    if (nextKey !== key) {
      regions = generate(territories, width, height, river);
      key = nextKey;
    }
    return regions;
  };
}
