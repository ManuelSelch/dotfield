import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { clearSavedGame, readSavedGame, writeSavedGame, SAVED_GAME_KEY } from './persistence';
import { TERRITORIES } from '../board/map';
import { createSession } from './session';
import { getTerritoryGrowthRate } from './features/growthRate';
import { advanceWorldStep } from './worldStep';
import { createTerrain } from './terrain/terrain';

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('round persistence', () => {
  it('round-trips a saved simulation and phase', () => {
    const target = storage();
    const state = createSimulation(TERRITORIES);
    writeSavedGame({ state, territories: TERRITORIES, ai: {}, phase: 'running' }, target);
    expect(readSavedGame(target)).toEqual({ state, territories: TERRITORIES, ai: {}, phase: 'running' });
  });

  it.each([undefined, 'player'])('restores captured Factory benefits and resets ownership on replay (legacy beneficiary %s)', beneficiaryId => {
    const target = storage();
    const territories = [{ id: 'home', owner: 'player', x: 80, y: 90, units: 36,
      features: [{ id: 'plant', kind: 'factory' as const, productionMultiplier: 2, ...(beneficiaryId ? { beneficiaryId } : {}) }] },
      { id: 'foe', owner: 'enemy', x: 80, y: 290, units: 36 }];
    const initial = createSimulation(territories);
    const state = { ...initial, territories: initial.territories.map(city => city.id === 'home' ? { ...city, owner: 'enemy' } : city) };
    writeSavedGame({ state, territories, ai: null, phase: 'paused' }, target);
    const saved = readSavedGame(target)!;
    const session = createSession(saved.territories, saved.ai, saved.state.rules, { initialState: saved.state, initialPhase: saved.phase });
    expect(getTerritoryGrowthRate(session.state, session.state.territories[0])).toBe(2);
    session.restart();
    expect(session.state.territories[0].owner).toBe('player');
    expect(getTerritoryGrowthRate(session.state, session.state.territories[0])).toBe(2);
  });

  it('restores Artillery cadence and terrain, pauses without firing, and replays fresh', () => {
    const target = storage();
    const territories = [
      { id: 'gun', owner: 'player', x: 180, y: 240, units: 20, features: [{ id: 'cannon', kind: 'artillery' as const, range: 90, fireIntervalMs: 2000 }] },
      { id: 'foe', owner: 'enemy', x: 180, y: 170, units: 5 },
    ];
    const terrain = createTerrain({ bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 }, barriers: [], crossings: [] });
    const state = advanceWorldStep(createSimulation(territories, { unitsPerSecond: 0 }, undefined, terrain), 1950);
    writeSavedGame({ state, territories, ai: null, phase: 'paused' }, target);
    const saved = readSavedGame(target)!;
    expect(saved.state).toEqual(state);
    const session = createSession(saved.territories, null, saved.state.rules, { initialState: saved.state, initialPhase: saved.phase });
    session.frame(0); session.frame(2000);
    expect(session.state).toEqual(state);
    session.resume(); session.frame(2000); session.frame(2050);
    expect(session.state.territories[1].units).toBe(4);
    session.restart();
    expect(session.state.terrain).toEqual(terrain);
    expect(session.state.artilleryTimers).toBeUndefined();
    expect(session.state.territories[1].units).toBe(5);
    target.setItem(SAVED_GAME_KEY, JSON.stringify({ ...saved, state: { ...saved.state, artilleryTimers: { cannon: { owner: 'player', elapsedMs: -1 } } } }));
    expect(readSavedGame(target)).toBeNull();
  });

  it('storage failures are nonfatal for reads, writes and clearing', () => {
    const fail = () => { throw new Error('Storage unavailable'); };
    expect(readSavedGame({ getItem: fail })).toBeNull();
    expect(() => writeSavedGame({ state: createSimulation(TERRITORIES), territories: TERRITORIES, ai: {}, phase: 'running' }, { setItem: fail })).not.toThrow();
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
