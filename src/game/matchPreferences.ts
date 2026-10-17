import { DEFAULT_MAP_SETTINGS, enemyIds, isMapSettings, type MapSettings } from '../board/generateMap';
import { layoutOf, selectLayout } from '../board/layoutSettings';
import { UPGRADES, type UpgradeId } from './upgrades/catalog';
import type { AiBehavior } from './ai/behaviors';

export const MATCH_PREFERENCES_KEY = 'dotfield.match-preferences.v1';
export interface MatchPreferences {
  readonly map: MapSettings;
  readonly upgrades: Readonly<Record<string, readonly UpgradeId[]>>;
  readonly aiBehaviors: Readonly<Record<string, AiBehavior>>;
}
export interface GeneratedMatch {
  readonly seed: number;
  readonly preferences: MatchPreferences;
}
export const defaultMatchPreferences = (): MatchPreferences => ({ map: selectLayout(DEFAULT_MAP_SETTINGS, 'mountains'), upgrades: { player: [] }, aiBehaviors: {} });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function isMatchPreferences(value: unknown): value is MatchPreferences {
  if (!isRecord(value) || !isMapSettings(value.map) || !isRecord(value.upgrades) || !isRecord(value.aiBehaviors)) return false;
  const enemies = enemyIds(4);
  return Object.entries(value.upgrades).every(([id, selected]) => (id === 'player' || enemies.includes(id))
    && Array.isArray(selected) && selected.every(upgrade => typeof upgrade === 'string' && Object.hasOwn(UPGRADES, upgrade)))
    && Object.entries(value.aiBehaviors).every(([id, behavior]) => enemies.includes(id)
      && ['balanced', 'aggressive', 'defensive'].includes(behavior as string));
}
export function isGeneratedMatch(value: unknown): value is GeneratedMatch {
  return isRecord(value) && Number.isInteger(value.seed) && (value.seed as number) >= 0 && (value.seed as number) < 2 ** 32
    && isMatchPreferences(value.preferences);
}
export function normalizeMatchPreferences(value: MatchPreferences): MatchPreferences {
  const { artillery: _legacyArtillery, watchtower: _legacyWatchtower, ...map } = value.map;
  return { ...value, map: selectLayout(map, layoutOf(map)) };
}
export function readMatchPreferences(storage?: Pick<Storage, 'getItem'>): MatchPreferences {
  try {
    const raw = (storage ?? window.localStorage).getItem(MATCH_PREFERENCES_KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!isMatchPreferences(value)) return defaultMatchPreferences();
    return normalizeMatchPreferences(value);
  } catch { return defaultMatchPreferences(); }
}
export function writeMatchPreferences(value: MatchPreferences, storage?: Pick<Storage, 'setItem'>): void {
  try { (storage ?? window.localStorage).setItem(MATCH_PREFERENCES_KEY, JSON.stringify(value)); } catch { /* Preferences are optional when storage is unavailable. */ }
}
