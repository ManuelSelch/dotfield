import type { Point, Territory } from '../../game/types';
import { projectBoard, screenPoint } from '../layout';
import type { River } from '../../game/river';
import { clipToCity } from './clip';

export interface CityRegion { readonly id: string; readonly points: readonly Point[] }

export function createCityRegions(territories: readonly Territory[], width: number, height: number, river?: River): CityRegion[] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
  const ids = new Set<string>();
  const positions = new Set<string>();
  for (const city of territories) {
    const key = `${city.x},${city.y}`;
    if (!Number.isFinite(city.x) || !Number.isFinite(city.y) || ids.has(city.id) || positions.has(key)) {
      throw new RangeError('City IDs and finite positions must be distinct.');
    }
    ids.add(city.id); positions.add(key);
  }
  const cities = projectBoard(territories, width, height);
  const riverTop = river ? screenPoint({ x: 0, y: river.top }, width, height).y : height;
  const riverBottom = river ? screenPoint({ x: 0, y: river.bottom }, width, height).y : 0;
  return cities.map(city => {
    const north = city.y < riverTop;
    const top = river && !north ? riverBottom : 0;
    const bottom = river && north ? riverTop : height;
    let points: Point[] = [{ x: 0, y: top }, { x: width, y: top }, { x: width, y: bottom }, { x: 0, y: bottom }];
    for (const other of cities) if (other.id !== city.id && (!river || (other.y < riverTop) === north)) points = clipToCity(points, city, other);
    return { id: city.id, points };
  });
}
