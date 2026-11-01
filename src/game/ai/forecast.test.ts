import { describe, expect, it } from 'vitest';

import { dispatchUnits } from '@/game/dispatch';
import { advanceRound } from '@/game/round';
import { createSimulation } from '@/game/state';

import { forecastBattle } from './forecast';

const nodes = [
  { id: 'player', owner: 'player' as const, units: 20, x: 0, y: 0 },
  { id: 'enemy', owner: 'enemy' as const, units: 20, x: 300, y: 0 },
  { id: 'neutral', owner: 'neutral' as const, units: 7, x: 200, y: 100 },
];

describe('known-order forecasting', () => {
  it.each([1000, 5000, 10000])('matches real growth, launches and combat at %i ms', (horizon) => {
    let initial = createSimulation(nodes);
    initial = dispatchUnits(initial, 'player', 'neutral');
    initial = dispatchUnits(initial, 'enemy', 'neutral', 'enemy');
    const snapshot = structuredClone(initial);
    const forecast = forecastBattle(initial, horizon);
    const actual = advanceRound(initial, horizon);
    expect(forecast.territories).toEqual(actual.territories);
    expect(forecast.transfers).toEqual(actual.transfers);
    expect(forecast.arrivals).toEqual(actual.arrivals);
    expect(initial).toEqual(snapshot);
  });
  it('never invents future orders or runs enemy decisions', () => {
    const forecast = forecastBattle(createSimulation(nodes), 10000);
    expect(forecast.transfers).toEqual([]);
    expect(forecast.territories.map((n) => n.units)).toEqual([30, 30, 7]);
  });
  it.each([-1, NaN, Infinity])('rejects invalid horizon %s', (horizon) => {
    expect(() => forecastBattle(createSimulation(nodes), horizon)).toThrow(RangeError);
  });
});
