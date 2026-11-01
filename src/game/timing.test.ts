import { describe, expect, it } from 'vitest';

import { TERRITORIES } from '@/board/map';

import { createClock } from './clock';
import { advanceGrowth } from './growth';
import { createSimulation } from './state';

function simulate(timestamps: number[]) {
  const clock = createClock();
  let state = createSimulation(TERRITORIES);
  for (const time of timestamps) state = advanceGrowth(state, clock.advance(time));
  return state;
}

describe('frame-independent growth', () => {
  it.each([30, 60, 120])('produces identical counts after 10 seconds at %i Hz', (fps) => {
    const times = Array.from({ length: fps * 10 + 1 }, (_, frame) => (frame * 1000) / fps);
    const state = simulate(times);
    expect(state.elapsedMs).toBe(10000);
    expect(state.territories[0].units).toBe(46);
    expect(state.territories.at(-1)!.units).toBe(46);
    expect(state.territories[1].units).toBe(8);
    expect(state.territories[0].growthRemainder).toBe(0);
  });

  it('matches regular frames for irregular timing and a long active stall', () => {
    expect(simulate([0, 7, 23, 499, 501, 1800, 9333, 10000])).toEqual(simulate([0, 10000]));
  });
});
