import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_SETTINGS } from '../board/generateMap';
import { defaultMatchPreferences, readMatchPreferences, writeMatchPreferences, MATCH_PREFERENCES_KEY, isMatchPreferences } from './matchPreferences';

describe('match preferences', () => {
  it('defaults missing, corrupt and unavailable storage safely', () => {
    for (const raw of [null, '{bad', '{}', JSON.stringify({ map: { cities: 99 } })])
      expect(readMatchPreferences({ getItem: () => raw })).toEqual(defaultMatchPreferences());
    expect(readMatchPreferences({ getItem: () => { throw Error('blocked'); } })).toEqual(defaultMatchPreferences());
  });
  it('remembers map options, player upgrades and inactive enemy settings', () => {
    const value = { map: { ...DEFAULT_MAP_SETTINGS, cities: 24, enemies: 1, artillery: true, watchtower: true, slowZone: true },
      upgrades: { player: ['industry' as const], 'enemy-4': ['factory' as const] },
      aiBehaviors: { enemy: 'aggressive' as const, 'enemy-4': 'defensive' as const } };
    let raw = '';
    writeMatchPreferences(value, { setItem: (key, data) => { expect(key).toBe(MATCH_PREFERENCES_KEY); raw = data; } });
    expect(readMatchPreferences({ getItem: () => raw })).toEqual(value);
    expect(() => writeMatchPreferences(value, { setItem: () => { throw Error('full'); } })).not.toThrow();
  });
  it('rejects saved map settings without the required field-feature flags', () => {
    const defaults = defaultMatchPreferences();
    const { watchtower: _omitted, ...oldMap } = defaults.map;
    const oldPreferences = { ...defaults, map: oldMap };
    expect(isMatchPreferences(oldPreferences)).toBe(false);
    expect(readMatchPreferences({ getItem: () => JSON.stringify(oldPreferences) })).toEqual(defaults);
  });
  it('rejects unknown factions, upgrades, behaviors and malformed selections', () => {
    const base = defaultMatchPreferences();
    for (const patch of [
      { upgrades: { player: ['cheat'] } }, { upgrades: { player: 'industry' } },
      { upgrades: { nobody: [] } }, { aiBehaviors: { player: 'balanced' } },
      { aiBehaviors: { enemy: 'impossible' } }, { map: { ...base.map, river: 'on' } },
    ]) expect(isMatchPreferences({ ...base, ...patch })).toBe(false);
  });
});
