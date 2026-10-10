import { createRiver, canRiverOrder } from './river';
import { createTerrain } from './terrain/terrain';
import { snapshotTerritories } from './features/snapshot';
import { canDirectTerrainOrder } from './terrain/directOrder';
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
    if (!isSavedGame(value)) return null;
    snapshotTerritories(value.territories);
    snapshotTerritories(value.state.territories);
    if (value.state.artilleryTimers !== undefined) {
      if (!isObject(value.state.artilleryTimers)) return null;
      for (const [id, timer] of Object.entries(value.state.artilleryTimers)) {
        const feature = value.state.territories.flatMap(c => c.features ?? []).find(f => f.id === id && f.kind === 'artillery');
        if (!feature || feature.kind !== 'artillery' || !isObject(timer)
          || typeof timer.owner !== 'string' || (timer.owner !== 'neutral' && !Object.hasOwn(value.state.rules.factions, timer.owner))
          || typeof timer.elapsedMs !== 'number' || !Number.isFinite(timer.elapsedMs)
          || timer.elapsedMs < 0 || timer.elapsedMs >= feature.fireIntervalMs) return null;
      }
    }
    if (value.state.artilleryShots !== undefined) {
      if (!Array.isArray(value.state.artilleryShots)) return null;
      for (const shot of value.state.artilleryShots) {
        if (!isObject(shot) || typeof shot.firedAtMs !== 'number' || !Number.isFinite(shot.firedAtMs)
          || shot.firedAtMs < 0 || shot.firedAtMs > value.state.elapsedMs
          || typeof shot.owner !== 'string' || !Object.hasOwn(value.state.rules.factions, shot.owner)
          || !value.state.territories.some(c => c.id === shot.sourceId && c.features?.some(f => f.kind === 'artillery'))
          || !value.state.territories.some(c => c.id === shot.targetId)) return null;
      }
    }
    if (value.state.terrain !== undefined) {
      const terrain = createTerrain(value.state.terrain);
      for (const transfer of value.state.transfers) {
        const source = value.state.territories.find(c => c.id === transfer.sourceId);
        const target = value.state.territories.find(c => c.id === transfer.targetId);
        if (!source || !target || !canDirectTerrainOrder(source, target, terrain, value.state.rules.factions[transfer.owner])) return null;
      }
    }
    if (value.state.river !== undefined) {
      const river = createRiver(value.state.river, value.territories);
      createRiver(river, value.state.territories);
      // Corrupt saves must not resume an illegal cross-bank flight/queue.
      for (const transfer of value.state.transfers) {
        const source = value.state.territories.find(c => c.id === transfer.sourceId);
        const target = value.state.territories.find(c => c.id === transfer.targetId);
        if (!source || !target || !canRiverOrder(source, target, river)) return null;
      }
      return { ...value, state: { ...value.state, river, ...(value.state.terrain ? { terrain: createTerrain(value.state.terrain) } : {}) } };
    }
    return value.state.terrain ? { ...value, state: { ...value.state, terrain: createTerrain(value.state.terrain) } } : value;
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
