import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_SETTINGS, generateMap, isMapSettings } from './generateMap';
import { canDirectTerrainOrder } from '../game/terrain/directOrder';
import { canRiverOrder, createRiver } from '../game/river';

const settings = { ...DEFAULT_MAP_SETTINGS, layout: 'courtyard' as const, cities: 24, enemies: 1 };
describe('Courtyard layout', () => {
  it('reserves an ordinary courtyard, two entrances, two crossings and three mountains', () => {
    const map = generateMap(settings, 42);
    expect(map.terrain?.barriers).toHaveLength(3);
    expect(map.river?.bridges).toHaveLength(2);
    expect(map.territories.find(c => c.id === 'courtyard')?.owner).toBe('neutral');
    expect(map.territories.some(c => c.id === 'entrance-north')).toBe(true);
    expect(map.territories.some(c => c.id === 'entrance-south')).toBe(true);
    expect(map.territories.filter(c => c.owner !== 'neutral').map(c => c.units)).toEqual([36, 36]);
    expect(generateMap(settings, 42)).toEqual(map);
    expect(generateMap(settings, 43).territories).not.toEqual(map.territories);
  });
  it('rejects unsupported Courtyard counts and opponents', () => {
    for (const patch of [{ cities: 19 }, { enemies: 2 }, { layout: 'unknown' }])
      expect(isMapSettings({ ...settings, ...patch })).toBe(false);
  });
  it('derives the existing terrain recipes from named layouts', () => {
    for (const layout of ['open', 'river', 'mountains'] as const) {
      const map = generateMap({ ...DEFAULT_MAP_SETTINGS, layout }, 1);
      expect(!!map.river).toBe(layout === 'river');
      expect(!!map.terrain).toBe(layout === 'mountains');
    }
  });
  it('keeps every supported count connected, clear and symmetrically accessible', () => {
    for (let seed = 0; seed < 30; seed++) for (let cities = 20; cities <= 30; cities++) {
      const map = generateMap({ ...settings, cities, industry: seed % 2 === 0, slowZone: seed % 3 === 0 }, seed);
      expect(map.territories).toHaveLength(cities);
      expect(new Set(map.territories.map(c => c.id)).size).toBe(cities);
      expect(map.territories.filter(c => c.features?.some(f => f.kind === 'factory'))).toHaveLength(seed % 2 === 0 ? 2 : 0);
      expect(map.territories.filter(c => c.features?.some(f => f.kind === 'slow-zone'))).toHaveLength(seed % 3 === 0 ? 1 : 0);
      expect(Object.isFrozen(map.territories)).toBe(true);
      expect(createRiver(map.river!, map.territories)).toEqual(map.river);
      for (const city of map.territories) {
        expect(city.x).toBeGreaterThanOrEqual(14); expect(city.x).toBeLessThanOrEqual(346);
        expect(city.y).toBeGreaterThanOrEqual(14); expect(city.y).toBeLessThanOrEqual(466);
        for (const other of map.territories) if (city !== other) expect(Math.hypot(city.x - other.x, city.y - other.y)).toBeGreaterThanOrEqual(35);
        for (const { bounds: b } of map.terrain!.barriers) expect(Math.hypot(Math.max(b.minX - city.x, 0, city.x - b.maxX), Math.max(b.minY - city.y, 0, city.y - b.maxY))).toBeGreaterThanOrEqual(16);
      }
      const edges = new Map(map.territories.map(a => [a.id, map.territories.filter(b => canRiverOrder(a, b, map.river) && canDirectTerrainOrder(a, b, map.terrain))]));
      const reachable = new Set([map.territories[0].id]);
      for (let i = 0; i < cities; i++) for (const a of map.territories) if (reachable.has(a.id)) for (const b of edges.get(a.id)!) reachable.add(b.id);
      expect(reachable.size).toBe(cities);
      const courtyard = map.territories.find(c => c.id === 'courtyard')!;
      for (const id of ['entrance-north', 'entrance-south']) expect(canDirectTerrainOrder(map.territories.find(c => c.id === id)!, courtyard, map.terrain)).toBe(true);
      const valley = map.territories.find(c => c.id === 'valley-west')!;
      expect(canDirectTerrainOrder(valley, courtyard, map.terrain)).toBe(false);
      const starts = map.territories.filter(c => c.owner !== 'neutral');
      expect(starts[0].y).toBe(starts[1].y);
      expect(starts[0].x + starts[1].x).toBe(360);
      const distances = starts.map(start => shortest(start.id, courtyard.id, map, edges));
      expect(Math.abs(distances[0] - distances[1])).toBeLessThan(0.001);
    }
  }, 30_000);
});
function shortest(from: string, to: string, map: ReturnType<typeof generateMap>, edges: Map<string, ReturnType<typeof generateMap>['territories'][number][]>) {
  const distances = new Map(map.territories.map(c => [c.id, c.id === from ? 0 : Infinity]));
  const remaining = new Set(map.territories.map(c => c.id));
  while (remaining.size) {
    const a = map.territories.filter(c => remaining.has(c.id)).sort((a, b) => distances.get(a.id)! - distances.get(b.id)!)[0];
    remaining.delete(a.id);
    for (const b of edges.get(a.id)!)
      distances.set(b.id, Math.min(distances.get(b.id)!, distances.get(a.id)! + Math.hypot(a.x - b.x, a.y - b.y)));
  }
  return distances.get(to)!;
}
