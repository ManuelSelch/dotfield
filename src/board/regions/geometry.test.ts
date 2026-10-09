import { describe, expect, it, vi } from 'vitest';
import { createCityRegions } from './geometry';
import { createRegionCache } from './cache';
import { TERRITORIES } from '../map';
import { hitTest } from '../hitTest';
import type { Point } from '../../game/types';

function area(points: readonly Point[]) {
  return Math.abs(points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length];
    return sum + p.x * next.y - p.y * next.x;
  }, 0)) / 2;
}
const twoCities = [
  { id: 'left', owner: 'player' as const, units: 10, x: 90, y: 240 },
  { id: 'right', owner: 'enemy' as const, units: 10, x: 270, y: 240 },
];

describe('automatically generated city regions', () => {
  it('splits the board at the midpoint between two city positions', () => {
    const cells = createCityRegions(twoCities, 360, 480);
    expect(cells.map(cell => area(cell.points))).toEqual([86400, 86400]);
    expect(Math.max(...cells[0].points.map(p => p.x))).toBe(180);
    expect(Math.min(...cells[1].points.map(p => p.x))).toBe(180);
  });
  it.each([[288, 350], [358, 640], [448, 650]])('fills the whole %i × %i canvas, including margins', (width, height) => {
    const cells = createCityRegions(TERRITORIES, width, height);
    expect(cells).toHaveLength(TERRITORIES.length);
    expect(cells.reduce((sum, cell) => sum + area(cell.points), 0)).toBeCloseTo(width * height, 5);
    for (const cell of cells) {
      expect(area(cell.points)).toBeGreaterThan(0);
      const center = cell.points.reduce((sum, p) => ({ x: sum.x + p.x / cell.points.length,
        y: sum.y + p.y / cell.points.length }), { x: 0, y: 0 });
      expect(hitTest(TERRITORIES, width, height, center)).toBe(cell.id);
      for (const p of cell.points) {
        expect(p.x).toBeGreaterThanOrEqual(-1e-7);
        expect(p.x).toBeLessThanOrEqual(width + 1e-7);
        expect(p.y).toBeGreaterThanOrEqual(-1e-7);
        expect(p.y).toBeLessThanOrEqual(height + 1e-7);
      }
    }
  });
  it('handles empty/zero-size layouts and a single city', () => {
    expect(createCityRegions([], 360, 480)).toEqual([]);
    expect(createCityRegions(twoCities, 0, 480)).toEqual([]);
    expect(area(createCityRegions([twoCities[0]], 360, 480)[0].points)).toBe(360 * 480);
  });
  it('rejects duplicate city positions and IDs rather than drawing overlapping regions', () => {
    expect(() => createCityRegions([twoCities[0], { ...twoCities[0], id: 'duplicate' }], 360, 480)).toThrow(RangeError);
    expect(() => createCityRegions([twoCities[0], { ...twoCities[1], id: 'left' }], 360, 480)).toThrow(RangeError);
  });
  it('only regenerates geometry when positions, identities or layout change', () => {
    const generate = vi.fn(createCityRegions);
    const get = createRegionCache(generate);
    const original = get(twoCities, 360, 480);
    const changedCounts = twoCities.map(n => ({ ...n, units: n.units + 20, owner: 'player' as const }));
    expect(get(changedCounts, 360, 480)).toBe(original);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(get(twoCities, 360, 640)).not.toBe(original);
    expect(get([{ ...twoCities[0], x: 100 }, twoCities[1]], 360, 640)).not.toBe(original);
    expect(generate).toHaveBeenCalledTimes(3);
  });
});
