import { describe, expect, it } from 'vitest';

import { chooseOrder } from './ai/decision';
import { forecastBattle } from './ai/forecast';
import { dispatchUnits } from './dispatch';
import { dotPosition } from './dots';
import { readSavedGame, writeSavedGame, SAVED_GAME_KEY } from './persistence';
import { createRiver, canRiverOrder, bridgeDecks } from './river';
import { createSession } from './session';
import { DOT_RADIUS } from './settings';
import { createSimulation } from './state';
import type { Territory } from './types';
import { advanceWorldStep } from './world-step';

const cities: Territory[] = [
  { id: 'north', x: 180, y: 50, owner: 'enemy', units: 36 },
  { id: 'nw', x: 80, y: 190, owner: 'enemy', units: 36 },
  { id: 'ne', x: 280, y: 190, owner: 'neutral', units: 8 },
  { id: 'sw', x: 80, y: 290, owner: 'player', units: 36 },
  { id: 'se', x: 280, y: 290, owner: 'neutral', units: 8 },
  { id: 'south', x: 180, y: 430, owner: 'player', units: 36 },
];
const input = {
  top: 225,
  bottom: 255,
  bridges: [
    { id: 'west', northId: 'nw', southId: 'sw', width: 64 },
    { id: 'east', northId: 'ne', southId: 'se', width: 64 },
  ],
};
const simulation = (seed = cities) => createSimulation(seed, undefined, input);

describe('explicit river bridge orders', () => {
  it('snapshots and validates bank endpoints and formation clearance', () => {
    const mutable = structuredClone(input);
    const river = createRiver(mutable, cities);
    mutable.bridges[0].width = 1;
    expect(river.bridges[0].width).toBe(64);
    expect(Object.isFrozen(river.bridges[0])).toBe(true);
    for (const bad of [
      { ...input, bottom: 200 },
      { ...input, bridges: [{ ...input.bridges[0], width: 20 }] },
      { ...input, bridges: [{ ...input.bridges[0], southId: 'missing' }] },
      { ...input, bridges: [input.bridges[0], input.bridges[0]] },
      { ...input, bridges: [{ ...input.bridges[0], southId: 'south' }] },
    ])
      expect(() => createRiver(bad, cities)).toThrow();
    expect(() =>
      createRiver(
        input,
        cities.map((c) => (c.id === 'nw' ? { ...c, y: 220 } : c)),
      ),
    ).toThrow();
    expect(bridgeDecks(river, cities)).toEqual([
      { id: 'west', x: 48, y: 221, width: 64, height: 38 },
      { id: 'east', x: 248, y: 221, width: 64, height: 38 },
    ]);
  });

  it('allows any same-bank order and only paired cross-bank orders regardless of ownership', () => {
    const state = simulation();
    const byId = (id: string) => state.territories.find((c) => c.id === id)!;
    expect(canRiverOrder(byId('south'), byId('sw'), state.river)).toBe(true);
    expect(canRiverOrder(byId('sw'), byId('nw'), state.river)).toBe(true);
    expect(canRiverOrder(byId('nw'), byId('sw'), state.river)).toBe(true);
    for (const target of ['north', 'ne'])
      expect(canRiverOrder(byId('sw'), byId(target), state.river)).toBe(false);
    expect(dispatchUnits(state, 'sw', 'nw').transfers).toHaveLength(7);
    expect(dispatchUnits(state, 'nw', 'sw', 'enemy').transfers).toHaveLength(7);
    expect(dispatchUnits(createSimulation(cities), 'south', 'north').transfers).toHaveLength(7);
  });

  it('rejects invalid replacement without changing the existing queue, counts or identities', () => {
    const state = dispatchUnits(simulation(), 'sw', 'nw');
    expect(dispatchUnits(state, 'sw', 'north')).toBe(state);
    expect(state.territories.find((c) => c.id === 'sw')?.units).toBe(31);
    expect(state.transfers.filter((t) => t.elapsedMs < 0)).toHaveLength(6);
  });

  it('keeps real staggered dots inside a compact bridge and uses unchanged forecast physics', () => {
    const seed = cities.map((c) => (c.id === 'nw' ? { ...c, owner: 'neutral', units: 8 } : c));
    const state = dispatchUnits(simulation(seed), 'sw', 'nw');
    const flight = state.transfers[0];
    for (let age = 0; age <= flight.durationMs; age += 10)
      for (const slot of flight.dotSlots) {
        const p = dotPosition(flight, slot, age);
        if (p.y + DOT_RADIUS >= 225 && p.y - DOT_RADIUS <= 255) {
          expect(p.x - DOT_RADIUS).toBeGreaterThanOrEqual(48);
          expect(p.x + DOT_RADIUS).toBeLessThanOrEqual(112);
        }
      }
    let live = state;
    for (let ms = 0; ms < 6000; ms += 50) live = advanceWorldStep(live, 50);
    expect(forecastBattle(state, 6000)).toEqual(live);
    expect(live.territories.find((c) => c.id === 'nw')?.owner).toBe('player');
    expect(live.transfers).toHaveLength(0); // No automatic onward forwarding.
  });

  it('preserves the river across save, restore and restart, and rejects broken bridge saves', () => {
    const state = dispatchUnits(simulation(), 'sw', 'nw');
    let raw = '';
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    };
    writeSavedGame({ state, territories: cities, ai: {}, phase: 'paused' }, storage);
    const saved = readSavedGame(storage)!;
    expect(saved.state).toEqual(state);
    const session = createSession(saved.territories, null, state.rules, {
      initialState: saved.state,
    });
    session.resume();
    expect(session.dispatch('south', 'north')).toBe(saved.state);
    session.restart();
    expect(session.state.river).toEqual(state.river);
    expect(session.state.transfers).toHaveLength(0);
    expect(session.state.territories.find((c) => c.id === 'sw')?.units).toBe(36);
    raw = JSON.stringify({
      ...saved,
      state: {
        ...saved.state,
        river: { ...input, bridges: [{ ...input.bridges[0], southId: 'missing' }] },
      },
    });
    expect(readSavedGame(storage)).toBeNull();
    expect(SAVED_GAME_KEY).toBe('dotfield.saved-game.v1');
  });

  it('AI stages to a friendly bridge endpoint instead of bypassing the river', () => {
    const seed = cities.map((c) =>
      c.y < input.top ? { ...c, owner: 'enemy', units: c.id === 'north' ? 36 : 1 } : c,
    );
    const state = simulation(seed);
    const order = chooseOrder(state);
    expect(order).toMatchObject({ sourceId: 'north', targetId: 'nw', kind: 'reinforce' });
    const crossed = chooseOrder(
      simulation(cities.map((c) => (c.id === 'north' ? { ...c, units: 1 } : c))),
    );
    expect(crossed?.sourceId).toBe('nw');
    const source = state.territories.find((c) => c.id === crossed?.sourceId)!;
    const target = state.territories.find((c) => c.id === crossed?.targetId)!;
    expect(canRiverOrder(source, target, state.river)).toBe(true);
  });
});
