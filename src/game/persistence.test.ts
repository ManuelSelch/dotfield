import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { clearSavedGame, readSavedGame, writeSavedGame, SAVED_GAME_KEY } from './persistence';
import { TERRITORIES } from '../board/map';
import { createSession } from './session';
import { getTerritoryGrowthRate } from './features/growthRate';

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
