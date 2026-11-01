import { describe, expect, it } from 'vitest';

import { sweptContact } from './sweep';

const point = (x: number, y = 0) => ({ x, y });

describe('swept circle contact', () => {
  it('finds first touch rather than checking only end positions', () => {
    expect(sweptContact(point(-20), point(20), point(20), point(-20), 10)).toBeCloseTo(0.375);
  });
  it('detects a tangent touch', () => {
    expect(sweptContact(point(-20, 10), point(20, 10), point(0), point(0), 10)).toBeCloseTo(0.5);
  });
  it('handles stationary overlap without dividing by zero', () => {
    expect(sweptContact(point(0), point(0), point(1), point(1), 10)).toBe(0);
    expect(sweptContact(point(0), point(0), point(20), point(20), 10)).toBeNull();
  });
  it('does not collide parallel or separating paths', () => {
    expect(sweptContact(point(0), point(10), point(20), point(30), 10)).toBeNull();
    expect(sweptContact(point(-20), point(-30), point(20), point(30), 10)).toBeNull();
  });
});
