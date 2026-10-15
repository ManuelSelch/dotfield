import { createRiver, canRiverOrder } from './river';
import { createTerrain } from './terrain/terrain';
import { snapshotTerritories } from './features/snapshot';
import { canDirectTerrainOrder } from './terrain/directOrder';
import { isGeneratedMatch, type GeneratedMatch } from './matchPreferences';
import { createRules } from './rules';
import { restoreCaptureShields } from './features/captureShield';
import { restoreNetworkShieldTimers, shieldRechargeSource } from './features/networkShields';
import { restoreAircraft } from './restoreAircraft';
import { DEFENDER_SHIELD_CAPACITY } from './settings';
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
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    const candidate: unknown = JSON.parse(raw);
    if (!isSavedGame(candidate)) return null;
    if (!isGeneratedMatch(candidate.generated)) delete (candidate as { generated?: unknown }).generated;
    const territories = snapshotTerritories(candidate.territories);
    const live = snapshotTerritories(candidate.state.territories) as SimulationState['territories'];
    if (!Number.isFinite(candidate.state.elapsedMs) || candidate.state.elapsedMs < 0
      || live.length !== territories.length
      || live.some(city => !territories.some(c => c.id === city.id && c.x === city.x && c.y === city.y)
        || !Number.isFinite(city.growthRemainder) || city.growthRemainder < 0 || city.growthRemainder >= 1000)) return null;
    const parsed = { ...candidate, territories, state: { ...candidate.state, territories: live } };
    const rules = createRules(parsed.state.rules);
    if ([...territories, ...live].some(c => c.owner !== 'neutral' && !Object.hasOwn(rules.factions, c.owner))) return null;
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
    if ((parsed.state.captureShields !== undefined && !isObject(parsed.state.captureShields))
      || (parsed.state.networkShieldTimers !== undefined && !isObject(parsed.state.networkShieldTimers))) return null;
    const normalized: SimulationState = { ...parsed.state, rules, homeCityIds,
      ...(terrain ? { terrain } : {}), ...(river ? { river } : {}),
      // Defender-earned charges survive conversion away, even without a faction shield upgrade.
      // Widen only the validation ceiling; do not change saved gameplay rules or grant charges.
      captureShields: restoreCaptureShields({ ...parsed.state, rules: { factions: Object.fromEntries(
        Object.entries(rules.factions).map(([id, faction]) => [id, { ...faction,
          captureShieldBatches: Math.max(DEFENDER_SHIELD_CAPACITY, faction.captureShieldBatches ?? 0) }]),
      ) } }),
      networkShieldTimers: restoreNetworkShieldTimers({ ...parsed.state, rules }) };
    for (const [id, timer] of Object.entries(normalized.networkShieldTimers ?? {})) {
      const active = shieldRechargeSource(normalized, id);
      if ((timer.capacity !== undefined && timer.capacity !== active.capacity)
        || (timer.source !== undefined && timer.source !== active.source)
        || (timer.resetAtMs !== undefined && (timer.elapsedMs !== 0 || timer.resetAtMs !== normalized.elapsedMs))) return null;
    }
    return { ...parsed, state: { ...normalized, ...restoreAircraft(normalized) } };
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
