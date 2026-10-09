import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { dispatchUnits } from './dispatch';
import { advanceTravel } from './travel';
import { resolveCombat } from './combat';
import { TERRITORIES } from '../board/map';
import type { Owner } from './types';

function attack(owner: Owner, units: number) {
  const state = createSimulation(TERRITORIES.map(t => t.id === 'centre' ? { ...t, owner, units } : t));
  return resolveCombat(advanceTravel(dispatchUnits(state, 'south', 'centre'), 100000));
}
const centre = (state: ReturnType<typeof createSimulation>) => state.territories.find(t => t.id === 'centre')!;

describe('combat and capture', () => {
  it('reinforces a friendly territory with all 18 dispatched units', () => {
    expect(centre(attack('player', 20))).toMatchObject({ owner: 'player', units: 38 });
  });
  it('reduces neutral defenders without capturing a stronger garrison', () => {
    expect(centre(attack('neutral', 20))).toMatchObject({ owner: 'neutral', units: 2 });
  });
  it('captures a weaker enemy and retains only surplus attackers', () => {
    expect(centre(attack('enemy', 5))).toMatchObject({ owner: 'player', units: 13, growthRemainder: 0 });
  });
  it.each(['enemy', 'neutral'] as const)('leaves a tied %s defender at zero without flipping ownership', owner => {
    expect(centre(attack(owner, 18))).toMatchObject({ owner, units: 0 });
  });
  it('consumes arrivals once, not again on the next frame', () => {
    const state = attack('neutral', 20);
    expect(state.arrivals).toEqual([]);
    expect(resolveCombat(state)).toBe(state);
  });
});
