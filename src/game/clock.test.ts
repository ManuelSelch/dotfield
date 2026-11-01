import { describe, expect, it } from 'vitest';

import { createClock } from './clock';

describe('fixed-step clock', () => {
  it('uses the first timestamp as a baseline and retains partial steps', () => {
    const clock = createClock(50);
    expect(clock.advance(500)).toBe(0);
    expect(clock.advance(525)).toBe(0);
    expect(clock.advance(550)).toBe(50);
    expect(clock.advance(625)).toBe(50);
    expect(clock.advance(650)).toBe(50);
  });

  it('includes elapsed active time after a slow frame without a per-tick loop', () => {
    const clock = createClock();
    clock.advance(0);
    expect(clock.advance(30000)).toBe(30000);
  });

  it('reset excludes hidden time but preserves a partial active step', () => {
    const clock = createClock(50);
    clock.advance(0);
    expect(clock.advance(25)).toBe(0);
    clock.reset();
    expect(clock.advance(60000)).toBe(0);
    expect(clock.advance(60025)).toBe(50);
  });

  it('rebaselines backwards timestamps without creating negative growth', () => {
    const clock = createClock(50);
    clock.advance(100);
    expect(clock.advance(50)).toBe(0);
    expect(clock.advance(100)).toBe(50);
  });

  it.each([0, -1, NaN, Infinity])('rejects an invalid step: %s', (step) => {
    expect(() => createClock(step)).toThrow(RangeError);
  });

  it.each([NaN, Infinity, -1])('rejects an invalid timestamp: %s', (timestamp) => {
    expect(() => createClock().advance(timestamp)).toThrow(RangeError);
  });
});
