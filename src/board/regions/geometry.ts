import type { Point, Territory } from '../../game/types';
import { projectBoard } from '../layout';
import { clipToCity } from './clip';

export interface CityRegion { readonly id: string; readonly points: readonly Point[] }

export function createCityRegions(territories: readonly Territory[], width: number, height: number): CityRegion[] {
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
  return cities.map(city => {
    let points: Point[] = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
    for (const other of cities) if (other.id !== city.id) points = clipToCity(points, city, other);
    return { id: city.id, points };
  });
}
