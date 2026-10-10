import { describe, expect, it } from 'vitest';
import { createTerrain } from './terrain';

const bounds = { minX: 0, minY: 0, maxX: 360, maxY: 480 };
const river = { id: 'river', kind: 'river' as const, bounds: { minX: 0, minY: 220, maxX: 360, maxY: 260 } };
const crossing = { id: 'bridge', kind: 'bridge' as const, barrierId: 'river',
  from: { x: 80, y: 220 }, to: { x: 80, y: 260 } };
const input = { bounds, barriers: [river], crossings: [crossing] };

describe('authored terrain snapshots', () => {
  it('copies and freezes nested bounds and crossing points', () => {
    const terrain = createTerrain(input);
    expect(terrain).toEqual(input);
    expect(terrain.bounds).not.toBe(bounds);
    expect(terrain.barriers[0].bounds).not.toBe(river.bounds);
    expect(terrain.crossings[0].from).not.toBe(crossing.from);
    expect(Object.isFrozen(terrain)).toBe(true);
    expect(Object.isFrozen(terrain.barriers)).toBe(true);
    expect(Object.isFrozen(terrain.barriers[0].bounds)).toBe(true);
    expect(Object.isFrozen(terrain.crossings[0].from)).toBe(true);
  });
  it.each([NaN, Infinity, 0, -1])('rejects invalid field width %s', maxX => {
    expect(() => createTerrain({ ...input, bounds: { ...bounds, maxX } })).toThrow();
  });
  it('rejects barriers outside the field and non-positive barrier area', () => {
    expect(() => createTerrain({ ...input, barriers: [{ ...river, bounds: { ...river.bounds, minX: -1 } }] })).toThrow();
    expect(() => createTerrain({ ...input, barriers: [{ ...river, bounds: { ...river.bounds, maxY: 220 } }] })).toThrow();
  });
  it('rejects duplicate or empty feature IDs', () => {
    expect(() => createTerrain({ ...input, barriers: [river, river] })).toThrow();
    expect(() => createTerrain({ ...input, crossings: [crossing, crossing] })).toThrow();
    expect(() => createTerrain({ ...input, crossings: [{ ...crossing, id: '' }] })).toThrow();
  });
  it('rejects missing barrier references and wrong crossing kinds', () => {
    expect(() => createTerrain({ ...input, crossings: [{ ...crossing, barrierId: 'missing' }] })).toThrow();
    expect(() => createTerrain({ ...input, crossings: [{ ...crossing, kind: 'pass' }] })).toThrow();
  });
  it('requires boundary endpoints with a real traversal through the barrier', () => {
    for (const change of [
      { from: { x: 80, y: 240 } },
      { from: { x: 80, y: 219 } },
      { to: { x: 100, y: 220 } },
      { to: crossing.from },
      { to: { x: NaN, y: 260 } },
    ]) expect(() => createTerrain({ ...input, crossings: [{ ...crossing, ...change }] })).toThrow();
  });
  it('rejects touching or overlapping barriers rather than creating zero-width shortcuts', () => {
    const mountain = { id: 'mountain', kind: 'mountain' as const,
      bounds: { minX: 100, minY: 100, maxX: 200, maxY: 200 } };
    for (const minX of [150, 200]) {
      expect(() => createTerrain({ bounds, barriers: [mountain, { ...mountain, id: 'other',
        bounds: { ...mountain.bounds, minX, maxX: 250 } }], crossings: [] })).toThrow();
    }
  });
  it('rejects a bridge obstructed by another barrier', () => {
    expect(() => createTerrain({ ...input, barriers: [river, {
      id: 'mountain', kind: 'mountain', bounds: { minX: 60, minY: 230, maxX: 100, maxY: 250 },
    }] })).toThrow();
  });
});
