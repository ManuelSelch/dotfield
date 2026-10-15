import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { convertCity } from './cityConversion';
import { advanceGrowth } from './growth';
import { getTerritoryGrowthRate } from './features/growthRate';
import { dispatchUnits } from './dispatch';
import type { CityType } from './types';

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
  it.each([
    ['production', 'defender', 20], ['production', 'airfield', 30],
    ['defender', 'production', 10], ['defender', 'airfield', 30],
    ['airfield', 'production', 10], ['airfield', 'defender', 20],
  ] as const)('converts %s to %s for %i without changing city identity or granting charges', (sourceType, targetType, cost) => {
    const base = createSimulation([{ id: 'a', owner: 'player', cityType: sourceType as CityType, units: cost + 1,
      x: 30, y: 70, features: [{ id: 'factory', kind: 'factory', productionMultiplier: 2 }] }]);
    const state = { ...base, territories: base.territories.map(c => ({ ...c, growthRemainder: 725 })) };
    const next = convertCity(state, 'a', targetType);
    expect(next.territories[0]).toMatchObject({ cityType: targetType, units: 1, x: 30, y: 70, growthRemainder: 0 });
    expect(next.territories[0].features).toBe(state.territories[0].features);
    expect(next.homeCityIds).toBe(state.homeCityIds);
    expect(next.captureShields).toEqual({});
    expect(convertCity(next, 'a', targetType)).toBe(next);
    const grown = advanceGrowth(next, 1000);
    expect(grown.territories[0].units).toBe(targetType === 'production' ? 3 : 1);
  });
  it.each([
    ['production', 'watchtower', 30], ['production', 'artillery', 40],
    ['watchtower', 'production', 10], ['watchtower', 'artillery', 40],
    ['artillery', 'production', 10], ['artillery', 'watchtower', 30],
  ] as const)('builds exclusive weapon role %s → %s for %i, resetting cadence and retaining a troop', (from, to, cost) => {
    const base = createSimulation([{ id: 'a', owner: 'player', cityType: from, units: cost + 1, x: 10, y: 20 }]);
    const state = { ...base, weaponTimers: { a: { owner: 'player', elapsedMs: 200 } }, artilleryShots: [{ sourceId: 'a', targetId: 'b', owner: 'player', firedAtMs: 0 }] };
    const next = convertCity(state, 'a', to);
    expect(next.territories[0]).toMatchObject({ cityType: to, units: 1, growthRemainder: 0 });
    expect(next.weaponTimers?.[to === 'watchtower' || to === 'artillery' ? 'a' : 'missing']).toEqual(
      to === 'watchtower' || to === 'artillery' ? { owner: 'player', elapsedMs: 0 } : undefined);
    expect(next.artilleryShots).toEqual([]);
    expect(advanceGrowth(next, 1000).territories[0].units).toBe(to === 'production' ? 2 : 1);
  });
  it('allows converting a plane at home during turnaround, but never while away', () => {
    const base = convertCity(opening(), 'a', 'airfield');
    const plane = base.aircraft!.a;
    const home = { ...base, aircraft: { a: { ...plane, phase: 'turnaround' as const, durationMs: 10000 } } };
    expect(convertCity(home, 'a', 'production').territories[0].cityType).toBe('production');
    for (const phase of ['outbound', 'unloading', 'returning'] as const) {
      const away = { ...base, aircraft: { a: { ...plane, phase } } };
      expect(convertCity(away, 'a', 'production')).toBe(away);
    }
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
