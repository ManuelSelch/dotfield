import type { Point, Territory } from './types';
import type { River } from './river';
import { clipToCity } from './regionClip';

export interface CityRegion { readonly id: string; readonly points: readonly Point[] }

/** Shared Voronoi clipping, independent of any screen or rendering API. */
export function territoryRegions(cities: readonly Pick<Territory, 'id' | 'x' | 'y'>[], width = 360, height = 480,
  river?: Pick<River, 'top' | 'bottom'>): CityRegion[] {
  const ids = new Set<string>(), positions = new Set<string>();
  for (const city of cities) {
    const position = `${city.x},${city.y}`;
    if (!Number.isFinite(city.x) || !Number.isFinite(city.y) || ids.has(city.id) || positions.has(position)) {
      throw new RangeError('City IDs and finite positions must be distinct.');
    }
    ids.add(city.id); positions.add(position);
  }
  return cities.map(city => {
    const north = !river || city.y < river.top;
    const top = river && !north ? river.bottom : 0, bottom = river && north ? river.top : height;
    let points: Point[] = [{ x: 0, y: top }, { x: width, y: top }, { x: width, y: bottom }, { x: 0, y: bottom }];
    for (const other of cities) {
      if (other.id !== city.id && (!river || (other.y < river.top) === north)) points = clipToCity(points, city, other);
    }
    return { id: city.id, points };
  });
}

const cache = new Map<string, readonly CityRegion[]>();
export function logicalTerritoryRegions(cities: readonly Territory[], river?: River): readonly CityRegion[] {
  const key = `${river?.top}:${river?.bottom}|${cities.map(c => `${c.id}:${c.x}:${c.y}`).join('|')}`;
  let regions = cache.get(key);
  if (!regions) {
    regions = territoryRegions(cities, 360, 480, river);
    cache.set(key, regions);
    if (cache.size > 8) cache.delete(cache.keys().next().value!);
  }
  return regions;
}
