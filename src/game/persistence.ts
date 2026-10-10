import { createRiver, canRiverOrder } from './river';
import { isGeneratedMatch, type GeneratedMatch } from './matchPreferences';
import { createRules } from './rules';
import { restoreCaptureShields } from './features/captureShield';
import type { AiConfigurations } from './ai/tick';
import type { SessionPhase } from './session';
import type { SimulationState, Territory } from './types';

export const SAVED_GAME_KEY = 'dotfield.saved-game.v1';

export interface SavedGame {
  readonly generated?: GeneratedMatch;
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

export function readSavedGame(storage?: Pick<Storage, 'getItem'>): SavedGame | null {
  try {
    const raw = (storage ?? window.localStorage).getItem(SAVED_GAME_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSavedGame(parsed)) return null;
    if (!isGeneratedMatch(parsed.generated)) delete (parsed as { generated?: unknown }).generated;
    const state = { ...parsed.state, rules: createRules(parsed.state.rules) };
    const value: SavedGame = { ...parsed, state: { ...state, captureShields: restoreCaptureShields(state) } };
    if (value.state.river !== undefined) {
      const river = createRiver(value.state.river, value.territories);
      createRiver(river, value.state.territories);
      // Corrupt saves must not resume an illegal cross-bank flight/queue.
      for (const transfer of value.state.transfers) {
        const source = value.state.territories.find(c => c.id === transfer.sourceId);
        const target = value.state.territories.find(c => c.id === transfer.targetId);
        if (!source || !target || !canRiverOrder(source, target, river)) return null;
      }
      return { ...value, state: { ...value.state, river } };
    }
    return value;
  } catch {
    return null;
  }
}

export function writeSavedGame(game: SavedGame, storage?: Pick<Storage, 'setItem'>): void {
  try { (storage ?? window.localStorage).setItem(SAVED_GAME_KEY, JSON.stringify(game)); } catch { /* Storage may be unavailable or full. */ }
}

export function clearSavedGame(storage?: Pick<Storage, 'removeItem'>): void {
  try { (storage ?? window.localStorage).removeItem(SAVED_GAME_KEY); } catch { /* Storage may be unavailable. */ }
}
