import { describe, expect, it } from 'vitest';
import { advanceWorldStep } from '../worldStep';
import { createSimulation } from '../state';
import { forecastBattle } from '../ai/forecast';
import type { SimulationState, Transfer } from '../types';

const tower = { id: 'tower', kind: 'watchtower' as const, range: 150, fireIntervalMs: 250 };
function armed(owner: 'player' | 'enemy' = 'player') {
  const attacker = owner === 'player' ? 'enemy' : 'player';
  const state = createSimulation([
    { id: 'home', owner, x: 100, y: 100, units: 10, features: [tower] },
    { id: 'away', owner: attacker, x: 160, y: 100, units: 10 },
  ]);
  const transfer: Transfer = { id: 1, sourceId: 'away', targetId: 'home', owner: attacker,
    units: 3, formationSize: 3, dotSlots: [0, 1, 2], from: { x: 160, y: 100 }, to: { x: 100, y: 100 },
    durationMs: 3000, elapsedMs: 0 };
  return { ...state, transfers: [transfer] };
}

describe('Watchtower', () => {
  it.each([[0, 1000], [110, 0], [Infinity, 1000]])('rejects invalid tower range/cadence %s %s', (range, fireIntervalMs) => {
    expect(() => createSimulation([
      { id: 'home', owner: 'player', x: 100, y: 100, units: 10,
        features: [{ ...tower, range, fireIntervalMs }] },
      { id: 'away', owner: 'enemy', x: 200, y: 100, units: 10 },
    ])).toThrow();
  });
  it('retains authored towers as immutable city features', () => {
    const state = createSimulation([
      { id: 'start', owner: 'player', x: 100, y: 100, units: 10, features: [tower] },
      { id: 'foe', owner: 'enemy', x: 200, y: 100, units: 10 },
    ]);
    expect(state.territories[0].features).toEqual([tower]);
    expect(state.territories[1].features).toBeUndefined();
  });
  it('destroys one in-range hostile dot every 250ms, preserving survivor slots', () => {
    let state = advanceWorldStep(armed(), 250);
    expect(state.transfers[0].dotSlots).toHaveLength(2);
    state = advanceWorldStep(state, 250);
    expect(state.transfers[0].dotSlots).toHaveLength(1);
    state = advanceWorldStep(state, 250);
    expect(state.transfers).toHaveLength(0);
  });
  it('does not fire on friendly transfers or transfers outside its range', () => {
    const state = armed();
    const friendly = { ...state.transfers[0], owner: 'player' as const };
    const friendlyState = advanceWorldStep({ ...state, transfers: [friendly] }, 2000);
    expect(friendlyState.transfers[0].dotSlots).toHaveLength(3);
    const distant = { ...state.transfers[0], from: { x: 500, y: 500 }, to: { x: 500, y: 600 } };
    expect(advanceWorldStep({ ...state, transfers: [distant] }, 2000).transfers[0].dotSlots).toHaveLength(3);
  });
  it('switches allegiance with city ownership and shoots the original owner after capture', () => {
    const state = armed('enemy');
    const result = advanceWorldStep(state, 500);
    expect(result.transfers[0].owner).toBe('player');
    expect(result.transfers[0].dotSlots).toHaveLength(1);
  });
  it('does not bank empty shots; an arriving target waits for the next cadence boundary', () => {
    let state: SimulationState = { ...armed(), transfers: [] };
    state = advanceWorldStep(state, 2000);
    const incoming = armed().transfers[0];
    state = { ...state, transfers: [incoming] };
    state = advanceWorldStep(state, 200);
    expect(state.transfers[0].dotSlots).toHaveLength(3);
    state = advanceWorldStep(state, 50);
    expect(state.transfers[0].dotSlots).toHaveLength(2);
  });
  it('fires at the same simulated times in a live step and an AI forecast', () => {
    const state = armed();
    expect(forecastBattle(state, 2000).transfers).toEqual(advanceWorldStep(state, 2000).transfers);
  });
  it('preserves fractional cadence across short steps', () => {
    const state = armed();
    const split = advanceWorldStep(advanceWorldStep(state, 125), 125);
    const bulk = advanceWorldStep(state, 250);
    expect(split.transfers).toEqual(bulk.transfers);
    expect(split.watchtowerElapsedMs).toEqual(bulk.watchtowerElapsedMs);
  });
});
