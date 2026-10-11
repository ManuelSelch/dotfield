import { describe, expect, it } from 'vitest';
import { resolveCombat } from '../combat';
import { createSimulation } from '../state';
import { advanceWorldStep } from '../worldStep';
import { readSavedGame, writeSavedGame } from '../persistence';
import { compileRoundSetup } from '../upgrades/compile';
import type { SimulationState, Territory, Transfer } from '../types';

function territories(size: number): Territory[] {
  return [
    ...Array.from({ length: size }, (_, index) => ({
      id: index === 0 ? 'home' : `city-${index}`, owner: 'player', units: 10,
      x: 40 + index * 70, y: 100,
    })),
    { id: 'enemy', owner: 'enemy', units: 10, x: 40, y: 350 },
  ];
}
function network(size: number): SimulationState {
  const map = territories(size);
  const setup = compileRoundSetup(map, { player: ['defensive-network'] });
  return createSimulation(setup.territories, setup.rules, setup.river, setup.terrain);
}
function attack(state: SimulationState, targetId: string, units = 5): SimulationState {
  const city = state.territories.find(node => node.id === targetId)!;
  const arrival: Transfer = { id: 1, sourceId: 'enemy', targetId, owner: 'enemy', units,
    formationSize: units, dotSlots: Array.from({ length: units }, (_, index) => index),
    from: { x: 40, y: 350 }, to: { x: city.x, y: city.y }, durationMs: 1, elapsedMs: 1 };
  return resolveCombat({ ...state, arrivals: [arrival] });
}

describe('Defensive Network shields', () => {
  it('regenerates one shield per connected city after exactly 10 seconds', () => {
    const before = advanceWorldStep(network(2), 9_999);
    expect(before.captureShields).toEqual({});
    const charged = advanceWorldStep(before, 1);
    expect(charged.captureShields).toMatchObject({ home: { remaining: 1 }, 'city-1': { remaining: 1 } });
  });

  it('uses network tier as the per-city capacity', () => {
    const first = advanceWorldStep(network(4), 10_000);
    expect(first.captureShields['city-1'].remaining).toBe(1);
    const second = advanceWorldStep(first, 10_000);
    expect(second.captureShields['city-1'].remaining).toBe(2);
    expect(advanceWorldStep(second, 10_000).captureShields['city-1'].remaining).toBe(2);
  });

  it('preserves existing charges above a lower network capacity', () => {
    const state = network(2);
    const overCapacity = { ...state, captureShields: { home: { remaining: 2 } } };
    const charged = advanceWorldStep(overCapacity, 10_000);
    expect(charged.captureShields.home.remaining).toBe(2);
    expect(charged.captureShields['city-1'].remaining).toBe(1);
  });

  it('regenerates for every upgraded faction, including AI factions', () => {
    const map: Territory[] = [
      { id: 'player-home', owner: 'player', units: 10, x: 50, y: 100 },
      { id: 'player-city', owner: 'player', units: 10, x: 170, y: 100 },
      { id: 'enemy-home', owner: 'enemy', units: 10, x: 50, y: 350 },
      { id: 'enemy-city', owner: 'enemy', units: 10, x: 170, y: 350 },
    ];
    const setup = compileRoundSetup(map, { player: ['defensive-network'], enemy: ['defensive-network'] });
    const charged = advanceWorldStep(createSimulation(setup.territories, setup.rules), 10_000);
    expect(charged.captureShields).toMatchObject({
      'player-home': { remaining: 1 }, 'player-city': { remaining: 1 },
      'enemy-home': { remaining: 1 }, 'enemy-city': { remaining: 1 },
    });
  });

  it('regenerates only for cities connected by owned shared borders', () => {
    const map: Territory[] = [
      { id: 'home', owner: 'player', units: 10, x: 40, y: 100 },
      { id: 'neighbor', owner: 'player', units: 10, x: 120, y: 100 },
      { id: 'blocker', owner: 'enemy', units: 10, x: 210, y: 100 },
      { id: 'isolated', owner: 'player', units: 10, x: 310, y: 100 },
      { id: 'enemy-home', owner: 'enemy', units: 10, x: 40, y: 350 },
    ];
    const setup = compileRoundSetup(map, { player: ['defensive-network'] });
    const charged = advanceWorldStep(createSimulation(setup.territories, setup.rules), 10_000);
    expect(charged.captureShields.home.remaining).toBe(1);
    expect(charged.captureShields.neighbor.remaining).toBe(1);
    expect(charged.captureShields.isolated).toBeUndefined();
  });

  it('resets partial recharge when a city disconnects and later rejoins', () => {
    const partial = advanceWorldStep(network(2), 5_000);
    const split = { ...partial, territories: partial.territories.map(city => city.id === 'home'
      ? { ...city, owner: 'enemy' } : city) };
    const disconnected = advanceWorldStep(split, 5_000);
    expect(disconnected.networkShieldTimers?.home).toBeUndefined();
    const recaptured = { ...disconnected, territories: disconnected.territories.map(city => city.id === 'home'
      ? { ...city, owner: 'player' } : city) };
    expect(advanceWorldStep(recaptured, 5_000).captureShields.home).toBeUndefined();
  });

  it('blocks one whole hostile arrival batch per shield, without changing garrison size', () => {
    const charged = advanceWorldStep(network(2), 10_000);
    const beforeUnits = charged.territories.find(city => city.id === 'city-1')!.units;
    const defended = attack(charged, 'city-1', 8);
    expect(defended.territories.find(city => city.id === 'city-1')).toMatchObject({ owner: 'player', units: beforeUnits });
    expect(defended.captureShields['city-1']).toMatchObject({ remaining: 0 });
  });

  it('starts a fresh 10-second cooldown after a shield is consumed', () => {
    const charged = advanceWorldStep(network(2), 10_000);
    const consumed = attack(charged, 'city-1');
    expect(advanceWorldStep(consumed, 9_999).captureShields['city-1'].remaining).toBe(0);
    const recharged = advanceWorldStep(consumed, 10_000);
    expect(recharged.captureShields['city-1']).toEqual({ remaining: 1 });
  });

  it('persists partial recharge timers and migrates older saves without granting shields', () => {
    const state = advanceWorldStep(network(2), 5_000);
    let raw = '';
    writeSavedGame({ state, territories: territories(2), ai: null, phase: 'paused' }, { setItem: (_key, value) => { raw = value; } });
    const restored = readSavedGame({ getItem: () => raw })!.state;
    expect(restored.networkShieldTimers).toEqual(state.networkShieldTimers);
    expect(advanceWorldStep(restored, 5_000).captureShields.home.remaining).toBe(1);

    const extraCharges = { ...network(2), captureShields: { home: { remaining: 2 } } };
    let chargedRaw = '';
    writeSavedGame({ state: extraCharges, territories: territories(2), ai: null, phase: 'paused' },
      { setItem: (_key, value) => { chargedRaw = value; } });
    expect(readSavedGame({ getItem: () => chargedRaw })!.state.captureShields.home.remaining).toBe(2);

    const { networkShieldTimers: _timers, ...legacy } = network(2);
    const oldRaw = JSON.stringify({ state: legacy, territories: territories(2), ai: null, phase: 'paused' });
    expect(readSavedGame({ getItem: () => oldRaw })!.state.networkShieldTimers).toEqual({});
    const corrupt = JSON.stringify({ state: { ...state, networkShieldTimers: { home: { owner: 'player', elapsedMs: 10_000 } } },
      territories: territories(2), ai: null, phase: 'paused' });
    expect(readSavedGame({ getItem: () => corrupt })).toBeNull();
  });
});
