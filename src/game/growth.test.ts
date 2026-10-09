import { describe, expect, it } from 'vitest';
import { TERRITORIES } from '../board/map';
import { createSimulation } from './state';
import { advanceGrowth } from './growth';

describe('unit growth', () => {
  it('grows both factions equally while leaving neutral defenders unchanged', () => {
    const initial = createSimulation(TERRITORIES);
    const next = advanceGrowth(initial, 3000);
    expect(next.elapsedMs).toBe(3000);
    next.territories.forEach((node, index) => {
      expect(node.units).toBe(initial.territories[index].units + (node.owner === 'neutral' ? 0 : 3));
    });
    expect(initial.elapsedMs).toBe(0);
    expect(initial.territories[0].units).toBe(36);
  });

  it('carries partial growth until there is a whole unit', () => {
    const partial = advanceGrowth(createSimulation(TERRITORIES), 750);
    expect(partial.territories[0].units).toBe(36);
    expect(partial.territories[0].growthRemainder).toBe(750);
    const next = advanceGrowth(partial, 250);
    expect(next.territories[0].units).toBe(37);
    expect(next.territories[0].growthRemainder).toBe(0);
  });

  it.each([0, 0.25, 2.5])('supports a configurable rate of %s units/second', (rate) => {
    const state = advanceGrowth(createSimulation(TERRITORIES, { unitsPerSecond: rate }), 4000);
    expect(state.territories[0].units).toBe(36 + rate * 4);
  });

  it('matches one elapsed update and many fractional updates at a unit boundary', () => {
    const initial = createSimulation(TERRITORIES);
    let split = initial;
    for (let i = 0; i < 600; i++) split = advanceGrowth(split, 1000 / 60);
    const once = advanceGrowth(initial, 10000);
    expect(split.territories.map((node) => node.units)).toEqual(once.territories.map((node) => node.units));
    expect(split.elapsedMs).toBeCloseTo(10000, 6);
    expect(split.territories[0].growthRemainder).toBeCloseTo(0, 6);
  });

  it('keeps zero-time updates unchanged', () => {
    const state = createSimulation(TERRITORIES);
    expect(advanceGrowth(state, 0)).toBe(state);
  });

  it.each([-1, NaN, Infinity])('rejects invalid elapsed time: %s', (elapsedMs) => {
    expect(() => advanceGrowth(createSimulation(TERRITORIES), elapsedMs)).toThrow(RangeError);
  });
});
