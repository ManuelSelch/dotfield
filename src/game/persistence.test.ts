import { describe, expect, it } from 'vitest';

import { generateMap } from '@/board/generate-map';
import { TERRITORIES } from '@/board/map';

import { getTerritoryGrowthRate } from './features/growth-rate';
import { snapshotTerritories } from './features/snapshot';
import { defaultMatchPreferences } from './match-preferences';
import { clearSavedGame, readSavedGame, writeSavedGame, SAVED_GAME_KEY } from './persistence';
import { createSession } from './session';
import { ARTILLERY_FIRE_INTERVAL_MS } from './settings';
import { createSimulation } from './state';
import { createTerrain } from './terrain/terrain';
import { advanceWorldStep } from './world-step';

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

describe('round persistence', () => {
  it('round-trips a saved simulation and phase', () => {
    const target = storage();
    const state = createSimulation(TERRITORIES);
    writeSavedGame({ state, territories: TERRITORIES, ai: {}, phase: 'running' }, target);
    expect(readSavedGame(target)).toEqual({
      state,
      territories: snapshotTerritories(TERRITORIES),
      ai: {},
      phase: 'running',
    });
  });

  it('backfills original home city IDs when restoring a legacy save', () => {
    const target = storage();
    const state = createSimulation(TERRITORIES);
    const { homeCityIds: _homeCityIds, ...legacyState } = state;
    writeSavedGame(
      { state: legacyState, territories: TERRITORIES, ai: {}, phase: 'paused' },
      target,
    );
    expect(readSavedGame(target)?.state.homeCityIds).toEqual({ player: 'south', enemy: 'north' });
  });

  it.each([undefined, 'player'])(
    'restores captured Factory benefits and resets ownership on replay (legacy beneficiary %s)',
    (beneficiaryId) => {
      const target = storage();
      const territories = [
        {
          id: 'home',
          owner: 'player',
          x: 80,
          y: 90,
          units: 36,
          features: [
            {
              id: 'plant',
              kind: 'factory' as const,
              productionMultiplier: 2,
              ...(beneficiaryId ? { beneficiaryId } : {}),
            },
          ],
        },
        { id: 'foe', owner: 'enemy', x: 80, y: 290, units: 36 },
      ];
      const initial = createSimulation(territories);
      const state = {
        ...initial,
        territories: initial.territories.map((city) =>
          city.id === 'home' ? { ...city, owner: 'enemy' } : city,
        ),
      };
      writeSavedGame({ state, territories, ai: null, phase: 'paused' }, target);
      const saved = readSavedGame(target)!;
      const session = createSession(saved.territories, saved.ai, saved.state.rules, {
        initialState: saved.state,
        initialPhase: saved.phase,
      });
      expect(getTerritoryGrowthRate(session.state, session.state.territories[0])).toBe(2);
      session.restart();
      expect(session.state.territories[0].owner).toBe('player');
      expect(getTerritoryGrowthRate(session.state, session.state.territories[0])).toBe(2);
    },
  );

  it('retains generated seeds, match preferences and exact layout through restore and restart', () => {
    const target = storage();
    const preferences = defaultMatchPreferences();
    const map = generateMap(preferences.map, 123);
    const state = createSimulation(map.territories, undefined, map.river, map.terrain);
    writeSavedGame(
      {
        state,
        territories: map.territories,
        ai: {},
        phase: 'paused',
        generated: { seed: map.seed, preferences },
      },
      target,
    );
    const saved = readSavedGame(target)!;
    expect(saved.generated).toEqual({ seed: 123, preferences });
    const session = createSession(saved.territories, saved.ai, saved.state.rules, {
      initialState: saved.state,
      initialPhase: saved.phase,
      river: saved.state.river,
    });
    session.restart();
    expect(session.state.territories).toEqual(state.territories);
    expect(session.state.river).toEqual(map.river);
    expect(session.state.terrain).toEqual(map.terrain);
    const raw = JSON.parse(target.getItem(SAVED_GAME_KEY)!);
    raw.generated.preferences.map.cities = 99;
    target.setItem(SAVED_GAME_KEY, JSON.stringify(raw));
    expect(readSavedGame(target)?.generated).toBeUndefined();
  });

  it('restores Artillery cadence and terrain, pauses without firing, and replays fresh', () => {
    const target = storage();
    const territories = [
      { id: 'gun', owner: 'player', cityType: 'artillery' as const, x: 180, y: 240, units: 20 },
      { id: 'foe', owner: 'enemy', x: 180, y: 170, units: 20 },
    ];
    const terrain = createTerrain({
      bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 },
      barriers: [],
      crossings: [],
    });
    const state = advanceWorldStep(
      createSimulation(territories, { unitsPerSecond: 0 }, undefined, terrain),
      ARTILLERY_FIRE_INTERVAL_MS - 10,
    );
    writeSavedGame({ state, territories, ai: null, phase: 'paused' }, target);
    const saved = readSavedGame(target)!;
    expect(saved.state).toEqual(state);
    const session = createSession(saved.territories, null, saved.state.rules, {
      initialState: saved.state,
      initialPhase: saved.phase,
    });
    session.frame(0);
    session.frame(2000);
    expect(session.state).toEqual(state);
    session.resume();
    session.frame(2000);
    session.frame(2050);
    expect(session.state.territories[1].units).toBe(19);
    session.restart();
    expect(session.state.terrain).toEqual(terrain);
    expect(session.state.weaponTimers?.gun).toEqual({ owner: 'player', elapsedMs: 0 });
    expect(session.state.territories[1].units).toBe(20);
    target.setItem(
      SAVED_GAME_KEY,
      JSON.stringify({
        ...saved,
        state: { ...saved.state, weaponTimers: { gun: { owner: 'player', elapsedMs: -1 } } },
      }),
    );
    expect(readSavedGame(target)).toBeNull();
  });

  it('migrates legacy attached weapons to exclusive roles and weapon cooldowns in opening and live state', () => {
    const target = storage();
    const tower = {
      id: 'old-tower-feature',
      kind: 'watchtower' as const,
      range: 150,
      fireIntervalMs: 250,
    };
    const gun = {
      id: 'old-gun-feature',
      kind: 'artillery' as const,
      range: 150,
      fireIntervalMs: 1000 / 3,
    };
    const territories = [
      { id: 'tower', owner: 'player', x: 50, y: 80, units: 30, features: [tower] },
      { id: 'gun', owner: 'enemy', x: 200, y: 300, units: 30, features: [gun] },
    ];
    const created = createSimulation(territories, { unitsPerSecond: 0 });
    const legacyState = {
      ...created,
      territories: created.territories.map((city) => ({
        ...city,
        cityType: 'production' as const,
        ...(city.id === 'tower'
          ? { features: [tower] }
          : city.id === 'gun'
            ? { features: [gun] }
            : {}),
      })),
      watchtowerElapsedMs: { 'old-tower-feature': 125 },
      artilleryTimers: { 'old-gun-feature': { owner: 'enemy', elapsedMs: 100 } },
    };
    const { weaponTimers: _timers, ...oldState } = legacyState;
    writeSavedGame({ state: oldState, territories, ai: null, phase: 'paused' }, target);
    const saved = readSavedGame(target)!;
    expect(saved.territories.map((city) => city.cityType)).toEqual(['watchtower', 'artillery']);
    expect(saved.territories.every((city) => city.features?.length === 0)).toBe(true);
    expect(saved.state.territories.map((city) => city.cityType)).toEqual([
      'watchtower',
      'artillery',
    ]);
    expect(saved.state.weaponTimers).toEqual({
      tower: { owner: 'player', elapsedMs: 125 },
      gun: { owner: 'enemy', elapsedMs: 100 },
    });
    const capturedLegacy = {
      ...oldState,
      territories: oldState.territories.map((city) =>
        city.id === 'tower' ? { ...city, owner: 'enemy' as const } : city,
      ),
      watchtowerElapsedMs: { 'old-tower-feature': 125 },
    };
    writeSavedGame({ state: capturedLegacy, territories, ai: null, phase: 'paused' }, target);
    expect(readSavedGame(target)?.state.weaponTimers?.tower).toEqual({
      owner: 'enemy',
      elapsedMs: 0,
    });
  });
  it('storage failures are nonfatal for reads, writes and clearing', () => {
    const fail = () => {
      throw new Error('Storage unavailable');
    };
    expect(readSavedGame({ getItem: fail })).toBeNull();
    expect(() =>
      writeSavedGame(
        {
          state: createSimulation(TERRITORIES),
          territories: TERRITORIES,
          ai: {},
          phase: 'running',
        },
        { setItem: fail },
      ),
    ).not.toThrow();
    expect(() => clearSavedGame({ removeItem: fail })).not.toThrow();
  });

  it('ignores corrupt or incomplete storage and can clear it', () => {
    const target = storage();
    target.values.set(SAVED_GAME_KEY, '{not json');
    expect(readSavedGame(target)).toBeNull();
    target.values.set(SAVED_GAME_KEY, JSON.stringify({ phase: 'running' }));
    expect(readSavedGame(target)).toBeNull();
    clearSavedGame(target);
    expect(target.values.has(SAVED_GAME_KEY)).toBe(false);
  });
});
