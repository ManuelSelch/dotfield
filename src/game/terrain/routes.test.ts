import { describe, expect, it } from 'vitest';
import { createTerrain } from './terrain';
import { planTerrainRoute } from './routes';
import { createRoute } from '../route';
import { BASE_FACTION_RULES } from '../rules';
import { dispatchUnits } from '../dispatch';
import { createSimulation } from '../state';
import { TERRITORY_RADIUS } from '../settings';

const bounds = { minX: 0, minY: 0, maxX: 360, maxY: 480 };
const river = { id: 'river', kind: 'river' as const, bounds: { minX: 0, minY: 220, maxX: 360, maxY: 260 } };
const bridge = (id: string, x: number) => ({ id, kind: 'bridge' as const, barrierId: 'river',
  from: { x, y: 220 }, to: { x, y: 260 } });
const south = { x: 180, y: 400 };
const north = { x: 180, y: 80 };

function riverField(xs: number[] = []) {
  return createTerrain({ bounds, barriers: [river], crossings: xs.map(x => bridge(`bridge-${x}`, x)) });
}

describe('terrain route queries', () => {
  it('retains the exact legacy border route without terrain', () => {
    for (const target of [north, { x: 190, y: 410 }, south]) {
      const legacy = createRoute(south, target);
      const route = planTerrainRoute(south, target)!;
      expect(route.points).toEqual([legacy.from, legacy.to]);
      expect(route.durationMs).toBe(legacy.durationMs);
      expect(route.crossingIds).toEqual([]);
    }
  });

  it('keeps a direct path on the same river bank', () => {
    expect(planTerrainRoute(south, { x: 280, y: 400 }, riverField())!.points)
      .toEqual([createRoute(south, { x: 280, y: 400 }).from, createRoute(south, { x: 280, y: 400 }).to]);
  });

  it('cannot cross an unbridged river or escape through its board-edge corners', () => {
    expect(planTerrainRoute(south, north, riverField())).toBeNull();
    expect(planTerrainRoute({ x: 0, y: 400 }, { x: 0, y: 80 }, riverField())).toBeNull();
  });

  it('crosses the river only along a bridge and accounts for the full detour', () => {
    const route = planTerrainRoute(south, north, riverField([80]))!;
    expect(route.crossingIds).toEqual(['bridge-80']);
    expect(route.points.slice(1, -1)).toEqual([{ x: 80, y: 260 }, { x: 80, y: 220 }]);
    expect(route.distance).toBeCloseTo(2 * Math.hypot(100, 140) + 40 - 2 * TERRITORY_RADIUS);
    expect(route.durationMs).toBeCloseTo(route.distance / 35 * 1000);
    expect(route.distance).toBeGreaterThan(320 - 2 * TERRITORY_RADIUS);
    expect(planTerrainRoute(north, south, riverField([80]))!.crossingIds).toEqual(['bridge-80']);
  });

  it('chooses the shortest crossing and uses stable ties independent of authoring order', () => {
    expect(planTerrainRoute({ x: 280, y: 400 }, { x: 280, y: 80 }, riverField([80, 280]))!.crossingIds)
      .toEqual(['bridge-280']);
    const first = planTerrainRoute(south, north, riverField([80, 280]));
    expect(planTerrainRoute(south, north, riverField([280, 80]))).toEqual(first);
    expect(first!.crossingIds).toEqual(['bridge-80']);
  });

  it('detours around a mountain and can use a shorter authored pass', () => {
    const mountain = { id: 'mountain', kind: 'mountain' as const,
      bounds: { minX: 140, minY: 200, maxX: 220, maxY: 280 } };
    const terrain = createTerrain({ bounds, barriers: [mountain], crossings: [] });
    const detour = planTerrainRoute(south, north, terrain)!;
    expect(detour.points.slice(1, -1)).toEqual([{ x: 140, y: 280 }, { x: 140, y: 200 }]);
    const pass = { id: 'pass', kind: 'pass' as const, barrierId: 'mountain',
      from: { x: 180, y: 200 }, to: { x: 180, y: 280 } };
    const shortcut = planTerrainRoute(south, north, createTerrain({ bounds, barriers: [mountain], crossings: [pass] }))!;
    expect(shortcut.crossingIds).toEqual(['pass']);
    expect(shortcut.distance).toBeCloseTo(320 - 2 * TERRITORY_RADIUS);
    expect(shortcut.distance).toBeLessThan(detour.distance);
  });

  it('uses a bridge across a vertical river and cannot walk along the top field edge', () => {
    const vertical = createTerrain({ bounds, barriers: [{ id: 'river', kind: 'river',
      bounds: { minX: 160, minY: 0, maxX: 200, maxY: 480 } }], crossings: [{
      id: 'bridge', kind: 'bridge', barrierId: 'river', from: { x: 160, y: 100 }, to: { x: 200, y: 100 },
    }] });
    expect(planTerrainRoute({ x: 80, y: 240 }, { x: 280, y: 240 }, vertical)!.crossingIds).toEqual(['bridge']);
    const noBridge = createTerrain({ ...vertical, crossings: [] });
    expect(planTerrainRoute({ x: 80, y: 0 }, { x: 280, y: 0 }, noBridge)).toBeNull();
  });

  it('finds a route through several barriers with stable barrier-order ties', () => {
    const barriers = [200, 300].map(y => ({ id: `mountain-${y}`, kind: 'mountain' as const,
      bounds: { minX: 140, minY: y, maxX: 220, maxY: y + 40 } }));
    const route = planTerrainRoute(south, north, createTerrain({ bounds, barriers, crossings: [] }))!;
    expect(route.points.slice(1, -1)).toEqual([{ x: 140, y: 340 }, { x: 140, y: 200 }]);
    expect(planTerrainRoute(south, north, createTerrain({ bounds, barriers: [...barriers].reverse(), crossings: [] })))
      .toEqual(route);
  });

  it('returns unreachable for out-of-field points or points inside barriers', () => {
    const terrain = riverField([80]);
    expect(planTerrainRoute({ x: -1, y: 400 }, north, terrain)).toBeNull();
    expect(planTerrainRoute(south, { x: 180, y: 240 }, terrain)).toBeNull();
  });

  it('matches legacy routes on an empty terrain field, including coincident endpoints', () => {
    const terrain = createTerrain({ bounds, barriers: [], crossings: [] });
    for (const target of [north, south, { x: 185, y: 405 }]) {
      expect(planTerrainRoute(south, target, terrain)).toEqual(planTerrainRoute(south, target));
    }
  });

  it('cannot cross even a very narrow full-width barrier without a bridge', () => {
    const terrain = createTerrain({ bounds, crossings: [], barriers: [{ ...river,
      bounds: { ...river.bounds, minY: 240, maxY: 240 + 1e-8 } }] });
    expect(planTerrainRoute(south, north, terrain)).toBeNull();
  });

  it('returns null for non-finite endpoints and rejects invalid speed', () => {
    expect(planTerrainRoute({ x: NaN, y: 400 }, north)).toBeNull();
    expect(planTerrainRoute(south, { x: 180, y: Infinity })).toBeNull();
    for (const travelSpeed of [0, -1, NaN, Infinity]) {
      expect(() => planTerrainRoute(south, north, undefined, { ...BASE_FACTION_RULES, travelSpeed })).toThrow();
    }
  });

  it('uses faction speed without changing geometry and does not mutate inputs', () => {
    const terrain = riverField([80]);
    const before = JSON.stringify(terrain);
    const route = planTerrainRoute(south, north, terrain)!;
    const faster = planTerrainRoute(south, north, terrain, { ...BASE_FACTION_RULES, travelSpeed: 70 })!;
    expect(faster.points).toEqual(route.points);
    expect(faster.durationMs).toBeCloseTo(route.durationMs / 2);
    expect(JSON.stringify(terrain)).toBe(before);
  });

  it('trims city borders along the path even when a bend falls inside the source radius', () => {
    const terrain = riverField([80]);
    const route = planTerrainRoute({ x: 85, y: 270 }, north, terrain)!;
    expect(route.points[0].x).toBe(80);
    expect(route.points[0].y).toBeCloseTo(270 - Math.sqrt(TERRITORY_RADIUS ** 2 - 5 ** 2));
    expect(Math.hypot(route.points[0].x - 85, route.points[0].y - 270)).toBeCloseTo(TERRITORY_RADIUS);
    expect(route.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
});

describe('safe terrain order validation before routed movement integration', () => {
  const cities = [
    { id: 'source', owner: 'player', units: 21, ...south },
    { id: 'old', owner: 'neutral', units: 10, x: 280, y: 400 },
    { id: 'new', owner: 'neutral', units: 10, ...north },
  ];
  it('does not replace a queue, deduct troops or allocate IDs for an unreachable order', () => {
    const state = dispatchUnits(createSimulation(cities), 'source', 'old');
    expect(dispatchUnits(state, 'source', 'new', 'player', riverField())).toBe(state);
    expect(state.transfers).toHaveLength(4);
    expect(state.territories[0].units).toBe(16);
  });
  it('also rejects crossing and bent-path orders until slice 2 can move them safely', () => {
    const state = dispatchUnits(createSimulation(cities), 'source', 'old');
    expect(dispatchUnits(state, 'source', 'new', 'player', riverField([80]))).toBe(state);
  });
  it('does not mistake a trimmed mountain detour for a legacy straight transfer', () => {
    const terrain = createTerrain({ bounds, crossings: [], barriers: [{ id: 'mountain', kind: 'mountain',
      bounds: { minX: 178, minY: south.y - TERRITORY_RADIUS + 2, maxX: 182, maxY: south.y - 4 } }] });
    const route = planTerrainRoute(south, north, terrain)!;
    expect(route.points).toHaveLength(2);
    expect(route.points[0].x).not.toBe(180);
    const state = createSimulation(cities);
    expect(dispatchUnits(state, 'source', 'new', 'player', terrain)).toBe(state);
  });
  it('preserves the same invalid-order state for any AI faction', () => {
    const state = createSimulation(cities.map(city => city.id === 'source' ? { ...city, owner: 'enemy-2' } : city));
    const queued = dispatchUnits(state, 'source', 'old', 'enemy-2');
    expect(dispatchUnits(queued, 'source', 'new', 'enemy-2', riverField())).toBe(queued);
  });
  it('still allows an unchanged direct order with terrain on the same bank', () => {
    const state = createSimulation(cities);
    expect(dispatchUnits(state, 'source', 'old', 'player', riverField()))
      .toEqual(dispatchUnits(state, 'source', 'old'));
  });
});
