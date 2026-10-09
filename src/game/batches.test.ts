import { describe, expect, it } from 'vitest';
import { TERRITORIES } from '../board/map';
import { createSimulation } from './state';
import { dispatchUnits } from './dispatch';
import { advanceTravel } from './travel';
import { resolveCombat } from './combat';

const target = (state: ReturnType<typeof createSimulation>) => state.territories.find(n => n.id === 'centre')!;

describe('real staggered arrivals', () => {
  it('reduces defenders on the first batch while the other batches still travel', () => {
    let state = dispatchUnits(createSimulation(TERRITORIES), 'south', 'centre');
    expect(state.transfers.map(t => t.units)).toEqual([5, 5, 5, 3]);
    const duration = state.transfers[0].durationMs;
    state = resolveCombat(advanceTravel(state, duration - 1));
    expect(target(state)).toMatchObject({ owner: 'neutral', units: 20 });
    state = resolveCombat(advanceTravel(state, 1));
    expect(target(state)).toMatchObject({ owner: 'neutral', units: 15 });
    expect(state.transfers).toHaveLength(3);
    state = resolveCombat(advanceTravel(state, 250));
    expect(target(state)).toMatchObject({ owner: 'neutral', units: 10 });
    state = resolveCombat(advanceTravel(state, 500));
    expect(target(state)).toMatchObject({ owner: 'neutral', units: 2 });
    expect(state.transfers).toHaveLength(0);
    expect(state.arrivals).toHaveLength(0);
    expect(state.territories.every(n => Number.isInteger(n.units))).toBe(true);
  });

  it('keeps ownership until attackers exceed the garrison, then reinforces', () => {
    let state = dispatchUnits(createSimulation(TERRITORIES.map(n => n.id === 'centre' ? { ...n, units: 7 } : n)), 'south', 'centre');
    state = resolveCombat(advanceTravel(state, state.transfers[0].durationMs));
    expect(target(state)).toMatchObject({ owner: 'neutral', units: 2 });
    state = resolveCombat(advanceTravel(state, 250));
    expect(target(state)).toMatchObject({ owner: 'player', units: 3 });
    state = resolveCombat(advanceTravel(state, 500));
    expect(target(state)).toMatchObject({ owner: 'player', units: 11 });
  });
});
