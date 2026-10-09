import { describe, expect, it } from 'vitest';
import { TERRITORIES } from '../board/map';
import { createSimulation } from './state';
import { dispatchUnits } from './dispatch';
import { advanceTravel, transferPosition } from './travel';

function launched() { return dispatchUnits(createSimulation(TERRITORIES), 'south', 'centre'); }

describe('elapsed-time travel', () => {
  it('interpolates positions without depending on viewport or frame count', () => {
    const state = launched();
    const duration = state.transfers[0].durationMs;
    const next = advanceTravel(state, duration / 2);
    expect(transferPosition(next.transfers[0])).toEqual({ x: 178.5, y: 327 });
    expect(state.transfers[0].elapsedMs).toBe(0);
  });

  it.each([30, 60, 120])('matches a single update at %i Hz', (fps) => {
    let state = launched();
    for (let i = 0; i < fps; i++) state = advanceTravel(state, 1000 / fps);
    expect(state.transfers[0].elapsedMs).toBeCloseTo(1000, 6);
    expect(transferPosition(state.transfers[0]).y)
      .toBeCloseTo(transferPosition(advanceTravel(launched(), 1000).transfers[0]).y, 6);
  });

  it('retains arrivals without applying combat or losing accounted units', () => {
    const state = launched();
    const next = advanceTravel(state, 10000);
    expect(next.transfers).toEqual([]);
    expect(next.arrivals.reduce((sum, batch) => sum + batch.units, 0)).toBe(18);
    expect(transferPosition(next.arrivals[0])).toEqual(next.arrivals[0].to);
    expect(next.territories).toBe(state.territories);
    const units = next.territories.reduce((sum, node) => sum + node.units, 0) + next.arrivals.reduce((sum, batch) => sum + batch.units, 0);
    expect(units).toBe(TERRITORIES.reduce((sum, node) => sum + node.units, 0));
    expect(advanceTravel(next, 10000).arrivals).toHaveLength(4);
  });

  it('leaves zero-time updates unchanged', () => {
    const state = launched();
    expect(advanceTravel(state, 0)).toBe(state);
  });

  it.each([-1, NaN, Infinity])('rejects invalid elapsed time %s', (elapsed) => {
    expect(() => advanceTravel(launched(), elapsed)).toThrow(RangeError);
  });
});
