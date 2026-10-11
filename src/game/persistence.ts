import { createRiver, canRiverOrder } from './river';
import { createTerrain } from './terrain/terrain';
import { snapshotTerritories } from './features/snapshot';
import { canDirectTerrainOrder } from './terrain/directOrder';
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
    && Array.isArray(state.territories) && Array.isArray(state.transfers)
    && isObject(state.rules) && typeof state.elapsedMs === 'number'
    && (state.roundStatus === 'playing' || state.roundStatus === 'victory' || state.roundStatus === 'defeat' || state.roundStatus === 'draw');
}

export function readSavedGame(storage?: Pick<Storage, 'getItem'>): SavedGame | null {
  try {
    const raw = (storage ?? window.localStorage).getItem(SAVED_GAME_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSavedGame(parsed)) return null;
    if (!isGeneratedMatch(parsed.generated)) delete (parsed as { generated?: unknown }).generated;
    snapshotTerritories(parsed.territories);
    snapshotTerritories(parsed.state.territories);
    const rules = createRules(parsed.state.rules);
    let terrain = parsed.state.terrain === undefined ? undefined : createTerrain(parsed.state.terrain);
    let river = parsed.state.river === undefined ? undefined : createRiver(parsed.state.river, parsed.territories);
    if (river) createRiver(river, parsed.state.territories);

    if (parsed.state.artilleryTimers !== undefined) {
      if (!isObject(parsed.state.artilleryTimers)) return null;
      for (const [id, timer] of Object.entries(parsed.state.artilleryTimers)) {
        const feature = parsed.state.territories.flatMap(c => c.features ?? []).find(f => f.id === id && f.kind === 'artillery');
        if (!feature || feature.kind !== 'artillery' || !isObject(timer)
          || typeof timer.owner !== 'string' || (timer.owner !== 'neutral' && !Object.hasOwn(rules.factions, timer.owner))
          || typeof timer.elapsedMs !== 'number' || !Number.isFinite(timer.elapsedMs)
          || timer.elapsedMs < 0 || timer.elapsedMs >= feature.fireIntervalMs) return null;
      }
    }
    if (parsed.state.artilleryShots !== undefined) {
      if (!Array.isArray(parsed.state.artilleryShots)) return null;
      for (const shot of parsed.state.artilleryShots) {
        if (!isObject(shot) || typeof shot.firedAtMs !== 'number' || !Number.isFinite(shot.firedAtMs)
          || shot.firedAtMs < 0 || shot.firedAtMs > parsed.state.elapsedMs
          || typeof shot.owner !== 'string' || !Object.hasOwn(rules.factions, shot.owner)
          || !parsed.state.territories.some(c => c.id === shot.sourceId && c.features?.some(f => f.kind === 'artillery'))
          || !parsed.state.territories.some(c => c.id === shot.targetId)) return null;
      }
    }
    if (terrain) for (const transfer of parsed.state.transfers) {
      const source = parsed.state.territories.find(c => c.id === transfer.sourceId);
      const target = parsed.state.territories.find(c => c.id === transfer.targetId);
      if (!source || !target || !canDirectTerrainOrder(source, target, terrain, rules.factions[transfer.owner])) return null;
    }
    if (river) for (const transfer of parsed.state.transfers) {
      const source = parsed.state.territories.find(c => c.id === transfer.sourceId);
      const target = parsed.state.territories.find(c => c.id === transfer.targetId);
      if (!source || !target || !canRiverOrder(source, target, river)) return null;
    }
    let homeCityIds = parsed.state.homeCityIds;
    if (homeCityIds !== undefined) {
      if (!isObject(homeCityIds)) return null;
      for (const [factionId, cityId] of Object.entries(homeCityIds)) {
        if (typeof cityId !== 'string' || !parsed.territories.some(city => city.id === cityId && city.owner === factionId)) return null;
      }
    } else {
      homeCityIds = Object.fromEntries(Object.keys(rules.factions).flatMap(factionId => {
        const home = parsed.territories.find(city => city.owner === factionId);
        return home ? [[factionId, home.id]] : [];
      }));
    }
    const normalized: SimulationState = { ...parsed.state, rules, homeCityIds,
      ...(terrain ? { terrain } : {}), ...(river ? { river } : {}),
      captureShields: restoreCaptureShields({ ...parsed.state, rules }) };
    return { ...parsed, state: normalized };
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
