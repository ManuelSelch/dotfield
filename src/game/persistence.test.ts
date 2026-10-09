import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { clearSavedGame, readSavedGame, writeSavedGame, SAVED_GAME_KEY } from './persistence';
import { TERRITORIES } from '../board/map';

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
