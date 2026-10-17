import { describe, expect, it } from 'vitest';
import { firstDefenderBlocker, segmentRegionEntry } from './defenderBorders';
import type { Territory } from './types';
import { createRiver } from './river';
import { logicalTerritoryRegions } from './territoryRegions';
import { createCityRegions } from '../board/regions/geometry';
import { screenPoint } from '../board/layout';
const cities: Territory[] = [
  { id: 'source', x: 40, y: 240, owner: 'player', units: 40 },
  { id: 'wall', x: 180, y: 240, owner: 'enemy', units: 0, cityType: 'defender' },
  { id: 'rear', x: 320, y: 240, owner: 'enemy', units: 10 },
];
describe('Defender region transit', () => {
  it('blocks hostile transit through the full region, even with zero garrison', () => {
    expect(firstDefenderBlocker(cities, cities[0], cities[2])?.id).toBe('wall');
  });
  it('permits attacks on the blocker and friendly passage', () => {
    expect(firstDefenderBlocker(cities, cities[0], cities[1])).toBeUndefined();
    expect(firstDefenderBlocker(cities, cities[2], cities[0])).toBeUndefined();
  });
  it('does not activate neutral Defenders; independently blocks every hostile faction', () => {
    expect(firstDefenderBlocker(cities.map(c => c.id === 'wall' ? { ...c, owner: 'neutral' } : c), cities[0], cities[2])).toBeUndefined();
    expect(firstDefenderBlocker(cities, { ...cities[0], owner: 'third' }, cities[2])?.id).toBe('wall');
  });
  it('ignores only the target Defender, not another blocker in front', () => {
    const two = cities.map(c => c.id === 'rear' ? { ...c, cityType: 'defender' as const } : c);
    expect(firstDefenderBlocker(two, two[0], two[2])?.id).toBe('wall');
  });
  it('changes access immediately on role and ownership changes', () => {
    for (const change of [{ cityType: 'production' as const }, { owner: 'player' }]) {
      expect(firstDefenderBlocker(cities.map(c => c.id === 'wall' ? { ...c, ...change } : c), cities[0], cities[2])).toBeUndefined();
    }
  });
  it('leaves an open end usable for manual city-to-city staging', () => {
    const around = [...cities,
      { id: 'north-west', x: 40, y: 40, owner: 'player', units: 10 },
      { id: 'north-east', x: 320, y: 40, owner: 'enemy', units: 10 }];
    expect(firstDefenderBlocker(around, around[3], around[4])).toBeUndefined();
    expect(firstDefenderBlocker(around, around[0], around[2])?.id).toBe('wall');
  });
  it('clips river-bank regions and agrees with rendered boundaries at every viewport/DPR-independent projection', () => {
    const banks: Territory[] = [
      { ...cities[0], y: 90 }, { ...cities[1], y: 190 }, { ...cities[2], y: 90 },
      { id: 'south', x: 180, y: 290, owner: 'player', units: 10 },
    ];
    const river = createRiver({ top: 225, bottom: 255, bridges: [{ id: 'cross', northId: 'wall', southId: 'south', width: 64 }] }, banks);
    const logical = logicalTerritoryRegions(banks, river);
    expect(logical.find(r => r.id === 'wall')!.points.every(p => p.y <= 225)).toBe(true);
    expect(logical.find(r => r.id === 'south')!.points.every(p => p.y >= 255)).toBe(true);
    expect(firstDefenderBlocker(banks, banks[3], banks[1], river)).toBeUndefined();
    for (const [width, height] of [[320, 480], [430, 600], [960, 480]]) {
      const drawn = createCityRegions(banks, width, height, river);
      // Internal bisectors are identical; only decorative off-field margins extend.
      const midpoint = screenPoint({ x: 180, y: 255 }, width, height);
      expect(Math.min(...drawn.find(r => r.id === 'south')!.points.map(p => p.y))).toBeCloseTo(midpoint.y);
      expect(firstDefenderBlocker(banks, banks[0], banks[2], river)?.id).toBe('wall');
    }
  });
  const square = [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }, { x: 100, y: 200 }];
  it('allows point tangency but blocks positive-length boundary hugging and interiors', () => {
    expect(segmentRegionEntry({ x: 0, y: 200 }, { x: 200, y: 0 }, square)).toBeNull();
    expect(segmentRegionEntry({ x: 0, y: 100 }, { x: 300, y: 100 }, square)).toBeCloseTo(1 / 3);
    expect(segmentRegionEntry({ x: 0, y: 150 }, { x: 300, y: 150 }, square)).toBeCloseTo(1 / 3);
    expect(segmentRegionEntry({ x: 0, y: 99 }, { x: 300, y: 99 }, square)).toBeNull();
  });
  it('does not allow a seam between adjacent Defenders', () => {
    const line: Territory[] = [cities[0], cities[2],
      { ...cities[1], id: 'upper', y: 180 }, { ...cities[1], id: 'lower', y: 300 }];
    expect(firstDefenderBlocker(line, line[0], line[1])?.id).toBe('lower');
    expect(firstDefenderBlocker([...line].reverse(), line[0], line[1])?.id).toBe('lower');
  });
});
