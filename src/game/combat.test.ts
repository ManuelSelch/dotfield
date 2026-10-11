import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { dispatchUnits } from './dispatch';
import { advanceTravel } from './travel';
import { resolveCombat } from './combat';
import { TERRITORIES } from '../board/map';
import { compileRoundSetup } from './upgrades/compile';
import type { Owner } from './types';

function attack(owner: Owner, units: number) {
  const state = createSimulation(TERRITORIES.map(t => t.id === 'centre' ? { ...t, owner, units } : t));
  return resolveCombat(advanceTravel(dispatchUnits(state, 'south', 'centre'), 100000));
}
const centre = (state: ReturnType<typeof createSimulation>) => state.territories.find(t => t.id === 'centre')!;

describe('combat and capture', () => {
  it('reinforces a friendly territory with all 35 dispatched units', () => {
    expect(centre(attack('player', 20))).toMatchObject({ owner: 'player', units: 55 });
  });
  it('reduces neutral defenders without capturing a stronger garrison', () => {
    expect(centre(attack('neutral', 37))).toMatchObject({ owner: 'neutral', units: 2 });
  });
  it('captures a weaker enemy and retains only surplus attackers', () => {
    expect(centre(attack('enemy', 5))).toMatchObject({ owner: 'player', units: 30, growthRemainder: 0 });
  });
  it.each(['enemy', 'neutral'] as const)('leaves a tied %s defender at zero without flipping ownership', owner => {
    expect(centre(attack(owner, 35))).toMatchObject({ owner, units: 0 });
  });
  it('increases the capture threshold for cities in an upgraded connected group', () => {
    const territories = TERRITORIES.map(city => ['south', 'lower-west', 'lower-east', 'south-west', 'west', 'upper-west'].includes(city.id)
      ? { ...city, owner: 'player', ...(city.id === 'upper-west' ? { units: 10 } : {}) } : city);
    const setup = compileRoundSetup(territories, { player: ['defensive-network'] });
    const state = createSimulation(setup.territories, setup.rules);
    const result = (units: number) => resolveCombat({ ...state, arrivals: [{
      id: 1, sourceId: 'north', targetId: 'upper-west', owner: 'enemy', units,
      formationSize: 5, dotSlots: [], from: { x: 115, y: 170 }, to: { x: 180, y: 40 }, durationMs: 1, elapsedMs: 1,
    }] });
    expect(result(12).territories.find(city => city.id === 'upper-west')).toMatchObject({ owner: 'player', units: 0 });
    expect(result(13).territories.find(city => city.id === 'upper-west')).toMatchObject({ owner: 'enemy', units: 1 });
  });

  it('keeps the normal capture threshold without the upgrade', () => {
    const territories = TERRITORIES.map(city => city.id === 'upper-west' ? { ...city, units: 10 } : city);
    const state = createSimulation(territories);
    const result = resolveCombat({ ...state, arrivals: [{
      id: 1, sourceId: 'north', targetId: 'upper-west', owner: 'enemy', units: 11,
      formationSize: 5, dotSlots: [], from: { x: 115, y: 170 }, to: { x: 180, y: 40 }, durationMs: 1, elapsedMs: 1,
    }] });
    expect(result.territories.find(city => city.id === 'upper-west')).toMatchObject({ owner: 'enemy', units: 1 });
  });

  it('consumes arrivals once, not again on the next frame', () => {
    const state = attack('neutral', 20);
    expect(state.arrivals).toEqual([]);
    expect(resolveCombat(state)).toBe(state);
  });
});
