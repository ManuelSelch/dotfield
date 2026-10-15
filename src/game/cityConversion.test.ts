import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { convertCity } from './cityConversion';
import { advanceGrowth } from './growth';
import { getTerritoryGrowthRate } from './features/growthRate';
import { dispatchUnits } from './dispatch';

const opening = () => createSimulation([{ id: 'a', owner: 'player', units: 101, x: 0, y: 0 }, { id: 'b', owner: 'enemy', units: 20, x: 200, y: 0 }]);
describe('city conversion', () => {
  it('normalizes legacy cities and charges only successful changes', () => {
    const state = opening();
    expect(state.territories[0].cityType).toBe('production');
    expect(convertCity(state, 'a', 'production')).toBe(state);
    const next = convertCity(state, 'a', 'defender');
    expect(next.territories[0]).toMatchObject({ cityType: 'defender', units: 81, growthRemainder: 0 });
    expect(state.territories[0].units).toBe(101);
    expect(convertCity(state, 'b', 'defender')).toBe(state);
    expect(convertCity({ ...state, roundStatus: 'victory' }, 'a', 'defender').territories).toBe(state.territories);
    expect(convertCity({ ...state, territories: state.territories.map(c => ({ ...c, units: 20 })) }, 'a', 'defender').territories[0].cityType).toBe('production');
  });
  it('cancels only unlaunched source reservations and gates growth selectors', () => {
    const queued = dispatchUnits(opening(), 'a', 'b');
    const next = convertCity(queued, 'a', 'airfield');
    expect(next.transfers).toHaveLength(1);
    expect(next.transfers[0].elapsedMs).toBe(0);
    expect(getTerritoryGrowthRate(next, next.territories[0])).toBe(0);
    expect(advanceGrowth(next, 10000).territories[0].units).toBe(next.territories[0].units);
    expect(next.aircraft?.a).toMatchObject({ phase: 'preparing', cargo: 0 });
  });
});
