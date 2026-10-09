import { describe, expect, it } from 'vitest';
import { MAPS } from './maps';
import { TERRITORIES } from './map';
import { FIELD, projectBoard } from './layout';
import { createCityRegions } from './regions/geometry';
import { hitTest } from './hitTest';

describe('fixed map presets', () => {
  it('keeps the original field and provides four distinct stable presets', () => {
    expect(MAPS).toHaveLength(4);
    expect(MAPS[0].territories).toBe(TERRITORIES);
    expect(MAPS[3].territories).toHaveLength(21);
    expect(new Set(MAPS.map(map => map.id)).size).toBe(4);
    expect(new Set(MAPS.map(map => JSON.stringify(map.territories.map(({ x, y }) => [x, y])))).size).toBe(4);
  });
  for (let index = 0; index < MAPS.length; index++) {
    it(`map ${index + 1} has equal armies and rotationally balanced positions/defenders`, () => {
      const cities = MAPS[index].territories;
      expect(cities.filter(city => city.owner === 'player').map(city => city.units)).toEqual([36]);
      expect(cities.filter(city => city.owner === 'enemy').map(city => city.units)).toEqual([36]);
      expect(new Set(cities.map(city => city.id)).size).toBe(cities.length);
      for (const city of cities) {
        expect(city.x).toBeGreaterThanOrEqual(FIELD.radius);
        expect(city.x).toBeLessThanOrEqual(FIELD.width - FIELD.radius);
        expect(city.y).toBeGreaterThanOrEqual(FIELD.radius);
        expect(city.y).toBeLessThanOrEqual(FIELD.height - FIELD.radius);
        const opposite = cities.find(other => other.x === FIELD.width - city.x && other.y === FIELD.height - city.y)!;
        expect(opposite).toBeDefined(); expect(opposite.units).toBe(city.units);
        expect(opposite.owner).toBe(city.owner === 'neutral' ? 'neutral' : city.owner === 'player' ? 'enemy' : 'player');
        for (const other of cities) if (other !== city) {
          expect(Math.hypot(city.x - other.x, city.y - other.y)).toBeGreaterThan(FIELD.radius * 2 + 12);
        }
      }
    });
    it(`map ${index + 1} has accessible full-region targets on the smallest board`, () => {
      const map = MAPS[index];
      const width = 288, height = 300;
      const projected = projectBoard(map.territories, width, height);
      const regions = createCityRegions(map.territories, width, height);
      for (const region of regions) {
        const area = Math.abs(region.points.reduce((sum, point, i, points) => {
          const next = points[(i + 1) % points.length]; return sum + point.x * next.y - next.x * point.y;
        }, 0)) / 2;
        expect(area).toBeGreaterThan(index === 3 ? 42 * 42 : 44 * 44);
        const city = projected.find(city => city.id === region.id)!;
        expect(hitTest(map.territories, width, height, city)).toBe(city.id);
      }
    });
  }
});
