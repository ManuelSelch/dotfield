import { describe, expect, it } from 'vitest';
import { TERRITORIES } from '../board/map';
import { createSimulation } from './state';
import { dispatchUnits } from './dispatch';

function initial(units = 36) {
  return createSimulation(TERRITORIES.map((node) => node.id === 'south' ? { ...node, units } : node));
}

describe('half-unit dispatch', () => {
  it.each([[36, 18], [37, 18], [2, 1]])('sends half of %i units, rounded down', (units, sent) => {
    const state = initial(units);
    const next = dispatchUnits(state, 'south', 'centre');
    expect(next.territories.at(-1)!.units).toBe(units - sent);
    expect(next.transfers.reduce((total, batch) => total + batch.units, 0)).toBe(sent);
    expect(next.transfers[0].owner).toBe('player');
    expect(next.transfers[0].targetId).toBe('centre');
    expect(state.territories.at(-1)!.units).toBe(units);
    expect(state.transfers).toEqual([]);
  });

  it.each([['south', 'south'], ['missing', 'centre'], ['south', 'missing'], ['north', 'centre'], ['centre', 'south']])(
    'ignores illegal player order %s → %s', (source, target) => {
      const state = initial();
      expect(dispatchUnits(state, source, target)).toBe(state);
    },
  );

  it.each([0, 1])('does not dispatch from a source with %i units', (units) => {
    const state = initial(units);
    expect(dispatchUnits(state, 'south', 'centre')).toBe(state);
  });

  it('deducts immediately and assigns unique ids to repeated orders', () => {
    let state = initial();
    state = dispatchUnits(state, 'south', 'centre');
    state = dispatchUnits(state, 'south', 'north');
    expect(state.territories.at(-1)!.units).toBe(9);
    expect(state.transfers.map((transfer) => transfer.units)).toEqual([5, 5, 5, 3, 5, 4]);
    expect(new Set(state.transfers.map((transfer) => transfer.id)).size).toBe(6);
  });

  it('allows a friendly destination without yet resolving reinforcement', () => {
    const state = createSimulation(TERRITORIES.map((node) => node.id === 'centre' ? { ...node, owner: 'player' as const } : node));
    expect(dispatchUnits(state, 'south', 'centre').transfers).toHaveLength(4);
  });
});
