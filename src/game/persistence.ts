import type { AiConfigurations } from './ai/tick';
import type { SessionPhase } from './session';
import type { SimulationState, Territory } from './types';

export const SAVED_GAME_KEY = 'dotfield.saved-game.v1';

export interface SavedGame {
  readonly state: SimulationState;
  readonly territories: readonly Territory[];
  readonly ai: AiConfigurations | null;
  readonly phase: Exclude<SessionPhase, 'ready'>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSavedGame(value: unknown): value is SavedGame {
  if (!isObject(value) || !isObject(value.state) || !Array.isArray(value.territories)) return false;
  const state = value.state;
  return (value.phase === 'running' || value.phase === 'paused')
    && Array.isArray(state.territories)
    && Array.isArray(state.transfers)
    && isObject(state.rules)
    && typeof state.elapsedMs === 'number'
    && (state.roundStatus === 'playing' || state.roundStatus === 'victory' || state.roundStatus === 'defeat' || state.roundStatus === 'draw');
}

export function readSavedGame(storage: Pick<Storage, 'getItem'> = window.localStorage): SavedGame | null {
  try {
    const raw = storage.getItem(SAVED_GAME_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isSavedGame(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeSavedGame(game: SavedGame, storage: Pick<Storage, 'setItem'> = window.localStorage): void {
  try { storage.setItem(SAVED_GAME_KEY, JSON.stringify(game)); } catch { /* Storage may be unavailable or full. */ }
}

export function clearSavedGame(storage: Pick<Storage, 'removeItem'> = window.localStorage): void {
  try { storage.removeItem(SAVED_GAME_KEY); } catch { /* Storage may be unavailable. */ }
}
