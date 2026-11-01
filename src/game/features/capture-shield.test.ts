import { describe, expect, it } from 'vitest';

import { forecastBattle } from '@/game/ai/forecast';
import { resolveCombat } from '@/game/combat';
import { dispatchUnits } from '@/game/dispatch';
import { readSavedGame, writeSavedGame } from '@/game/persistence';
import { createRules } from '@/game/rules';
import { createSession } from '@/game/session';
import { createSimulation } from '@/game/state';
import type { SimulationState, Transfer } from '@/game/types';
import { compileRoundSetup } from '@/game/upgrades/compile';
import { advanceWorldStep } from '@/game/world-step';

import { snapshotTerritories } from './snapshot';

const cities = [
  { id: 'home', owner: 'player', units: 36, x: 50, y: 100 },
  { id: 'target', owner: 'neutral', units: 2, x: 160, y: 100 },
  { id: 'enemy', owner: 'enemy', units: 36, x: 280, y: 100 },
];
function setup(enemyUpgrade = false) {
  const setup = compileRoundSetup(cities, {
    player: ['capture-shield'],
    enemy: enemyUpgrade ? ['capture-shield'] : [],
  });
  return createSimulation(setup.territories, setup.rules);
}
function arrive(state: SimulationState, owner: string, units: number, targetId = 'target') {
  const arrival: Transfer = {
    id: 1,
    sourceId: 'home',
    targetId,
    owner,
    units,
    formationSize: units,
    dotSlots: Array.from({ length: units }, (_, i) => i),
    from: { x: 50, y: 100 },
    to: { x: 160, y: 100 },
    durationMs: 1,
    elapsedMs: 1,
  };
  return resolveCombat({ ...state, arrivals: [arrival] });
}
const target = (state: SimulationState) => state.territories.find((c) => c.id === 'target')!;

describe('Capture shield', () => {
  it('compiles independently, deduplicates, leaves starting cities unshielded and maps untouched', () => {
    const setup = compileRoundSetup(cities, { player: ['capture-shield', 'capture-shield'] });
    expect(setup.rules.factions.player.captureShieldBatches).toBe(3);
    expect(setup.rules.factions.enemy.captureShieldBatches).toBe(0);
    expect(createSimulation(setup.territories, setup.rules).captureShields).toEqual({});
    expect(setup.territories).toEqual(snapshotTerritories(cities));
    expect(cities[0]).not.toHaveProperty('cityType');
  });
  it('grants three charges only after successful capture, not a tie or reinforcement', () => {
    let state = arrive(setup(), 'player', 2);
    expect(state.captureShields).toEqual({});
    state = arrive(state, 'player', 5);
    expect(target(state)).toMatchObject({ owner: 'player', units: 5 });
    expect(state.captureShields.target.remaining).toBe(3);
    state = arrive(state, 'player', 5);
    expect(target(state).units).toBe(10);
    expect(state.captureShields.target.remaining).toBe(3);
  });
  it('blocks three whole batches, then the fourth damages the garrison; never regenerates', () => {
    let state = arrive(setup(), 'player', 20);
    for (const remaining of [2, 1, 0]) {
      state = arrive(state, 'enemy', 5);
      expect(target(state).units).toBe(18);
      expect(state.captureShields.target.remaining).toBe(remaining);
    }
    state = advanceWorldStep(state, 1000);
    expect(state.captureShields.target.remaining).toBe(0);
    expect(target(arrive(state, 'enemy', 5)).units).toBe(14);
  });
  it('consumes one charge for a surviving partial batch, but none for an empty arrival', () => {
    let state = arrive(setup(), 'player', 5);
    state = arrive(state, 'enemy', 0);
    expect(state.captureShields.target.remaining).toBe(3);
    state = arrive(state, 'enemy', 1);
    expect(state.captureShields.target.remaining).toBe(2);
    expect(target(state).units).toBe(3);
  });
  it('refreshes on qualifying recapture and clears on capture by an unupgraded owner', () => {
    let state = arrive(setup(), 'player', 5);
    for (let i = 0; i < 3; i++) state = arrive(state, 'enemy', 5);
    state = arrive(state, 'enemy', 5);
    expect(target(state).owner).toBe('enemy');
    expect(state.captureShields.target).toBeUndefined();
    state = arrive(state, 'player', 5);
    expect(state.captureShields.target.remaining).toBe(3);
  });
  it('grants the same bonus to AI factions and never transfers old charges', () => {
    const state = arrive(setup(true), 'enemy', 5);
    expect(state.captureShields.target.remaining).toBe(3);
    expect(target(arrive(state, 'player', 5)).units).toBe(3);
  });
  it('supports independently upgraded AI factions in a multi-enemy round', () => {
    const map = [...cities, { id: 'other', owner: 'enemy-2', units: 20, x: 250, y: 320 }];
    const setup = compileRoundSetup(map, { 'enemy-2': ['capture-shield'] });
    const state = arrive(createSimulation(setup.territories, setup.rules), 'enemy-2', 5);
    expect(state.captureShields.target.remaining).toBe(3);
    expect(setup.rules.factions.player.captureShieldBatches).toBe(0);
    expect(setup.rules.factions.enemy.captureShieldBatches).toBe(0);
  });
  it('protects a zero-garrison city and leaves terminal combat untouched', () => {
    const state = arrive(setup(), 'player', 5);
    const empty = {
      ...state,
      territories: state.territories.map((c) => (c.id === 'target' ? { ...c, units: 0 } : c)),
    };
    const defended = arrive(empty, 'enemy', 5);
    expect(target(defended)).toMatchObject({ owner: 'player', units: 0 });
    expect(defended.captureShields.target.remaining).toBe(2);
    const terminal = { ...state, roundStatus: 'victory' as const };
    expect(arrive(terminal, 'enemy', 5).captureShields).toBe(terminal.captureShields);
  });
  it('resolves arrivals sequentially: capture arms a shield for later hostile batches', () => {
    const state = setup();
    const batch = {
      id: 1,
      sourceId: 'home',
      targetId: 'target',
      owner: 'player',
      units: 5,
      formationSize: 5,
      dotSlots: [0, 1, 2, 3, 4],
      from: { x: 50, y: 100 },
      to: { x: 160, y: 100 },
      durationMs: 1,
      elapsedMs: 1,
    };
    const next = resolveCombat({
      ...state,
      arrivals: [batch, ...[2, 3, 4, 5].map((id) => ({ ...batch, id, owner: 'enemy' }))],
    });
    expect(target(next)).toMatchObject({ owner: 'enemy', units: 2 });
    expect(next.captureShields.target).toBeUndefined();
    expect(next.arrivals).toEqual([]);
    expect(state.captureShields).toEqual({});
  });
  it('shares batch absorption with forecasts without mutating input runtime', () => {
    const captured = arrive(setup(), 'player', 5);
    const state = dispatchUnits(captured, 'enemy', 'target', 'enemy');
    const forecast = forecastBattle(state, 5000);
    let actual = state;
    for (let ms = 0; ms < 5000; ms += 50) actual = advanceWorldStep(actual, 50);
    expect(forecast.territories).toEqual(actual.territories);
    expect(forecast.captureShields).toEqual(actual.captureShields);
    expect(state.captureShields.target.remaining).toBe(3);
  });
  it('persists depletion, resets on restart and freezes paused/hidden sessions', () => {
    const captured = arrive(arrive(setup(), 'player', 5), 'enemy', 5);
    let raw = '';
    writeSavedGame(
      { state: captured, territories: cities, ai: null, phase: 'paused' },
      {
        setItem: (_key, value) => {
          raw = value;
        },
      },
    );
    const saved = readSavedGame({ getItem: () => raw })!;
    expect(saved.state.captureShields.target.remaining).toBe(2);
    const session = createSession(cities, null, captured.rules, {
      initialState: saved.state,
      initialPhase: 'paused',
    });
    session.frame(10000);
    expect(session.state.captureShields.target.remaining).toBe(2);
    session.resume();
    session.setHidden(true);
    session.frame(20000);
    expect(session.state.captureShields.target.remaining).toBe(2);
    session.restart();
    expect(session.state.captureShields).toEqual({});
    expect(session.state.rules.factions.player.captureShieldBatches).toBe(3);
  });
  it('migrates legacy saves and rejects corrupt shield runtime', () => {
    const state = setup();
    const { captureShields: _runtime, ...legacy } = state;
    const read = (state: unknown) =>
      readSavedGame({
        getItem: () => JSON.stringify({ state, territories: cities, ai: null, phase: 'paused' }),
      });
    expect(read(legacy)!.state.captureShields).toEqual({});
    for (const remaining of [-1, 1.5, 4, '3'])
      expect(read({ ...state, captureShields: { target: { remaining } } })).toBeNull();

    expect(read({ ...state, captureShields: { missing: { remaining: 1 } } })).toBeNull();
    expect(read({ ...state, captureShields: { target: { remaining: 1 } } })).toBeNull(); // neutral cannot have a shield
  });
  it.each([-1, 1.5, NaN, Infinity, 4])('rejects invalid charge rule %s', (captureShieldBatches) => {
    expect(() =>
      createRules({
        factions: {
          player: {
            unitsPerSecond: 1,
            travelSpeed: 35,
            batchIntervalMs: 600,
            captureShieldBatches,
          },
        },
      }),
    ).toThrow();
  });
});
