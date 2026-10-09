import { describe, expect, it } from 'vitest';
import { TERRITORIES } from '../board/map';
import { createSimulation } from './state';

describe('simulation state', () => {
  it('starts each session independently without modifying the map', () => {
    const first = createSimulation(TERRITORIES);
    const second = createSimulation(TERRITORIES);
    expect(first.elapsedMs).toBe(0);
    expect(first.territories.map((node) => node.units)).toEqual(TERRITORIES.map((node) => node.units));
    expect(first.territories[0]).not.toBe(TERRITORIES[0]);
    expect(first.territories[0]).not.toBe(second.territories[0]);
    expect(first.territories.every((node) => node.growthRemainder === 0)).toBe(true);
  });

  it('copies configurable rules and permits zero growth', () => {
    const rules = { unitsPerSecond: 0 };
    const state = createSimulation(TERRITORIES, rules);
    rules.unitsPerSecond = 100;
    expect(state.rules.factions.player.unitsPerSecond).toBe(0);
    expect(state.rules.factions.enemy.unitsPerSecond).toBe(0);
  });

  it.each([-1, NaN, Infinity])('rejects an invalid growth rate: %s', (rate) => {
    expect(() => createSimulation(TERRITORIES, { unitsPerSecond: rate })).toThrow(RangeError);
  });
});
