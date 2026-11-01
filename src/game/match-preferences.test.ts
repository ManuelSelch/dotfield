import { describe, expect, it } from 'vitest';

import { DEFAULT_MAP_SETTINGS } from '@/board/generate-map';

import {
  defaultMatchPreferences,
  readMatchPreferences,
  writeMatchPreferences,
  MATCH_PREFERENCES_KEY,
  isMatchPreferences,
} from './match-preferences';

describe('match preferences', () => {
  it('defaults missing, corrupt and unavailable storage safely', () => {
    for (const raw of [null, '{bad', '{}', JSON.stringify({ map: { cities: 99 } })])
      expect(readMatchPreferences({ getItem: () => raw })).toEqual(defaultMatchPreferences());
    expect(
      readMatchPreferences({
        getItem: () => {
          throw Error('blocked');
        },
      }),
    ).toEqual(defaultMatchPreferences());
  });
  it('remembers map options, player upgrades and inactive enemy settings', () => {
    const value = {
      map: {
        ...DEFAULT_MAP_SETTINGS,
        cities: 24,
        enemies: 1,
        mountains: false,
        artillery: true,
        watchtower: true,
        slowZone: true,
      },
      upgrades: { player: ['industry' as const], 'enemy-4': ['factory' as const] },
      aiBehaviors: { enemy: 'aggressive' as const, 'enemy-4': 'defensive' as const },
    };
    let raw = '';
    writeMatchPreferences(value, {
      setItem: (key, data) => {
        expect(key).toBe(MATCH_PREFERENCES_KEY);
        raw = data;
      },
    });
    expect(readMatchPreferences({ getItem: () => raw })).toEqual({
      ...value,
      map: {
        cities: 24,
        enemies: 1,
        industry: true,
        river: true,
        mountains: false,
        slowZone: true,
        layout: 'river',
      },
    });
    expect(() =>
      writeMatchPreferences(value, {
        setItem: () => {
          throw Error('full');
        },
      }),
    ).not.toThrow();
  });
  it('migrates legacy weapon toggles away while keeping other saved map settings', () => {
    const defaults = defaultMatchPreferences();
    const oldPreferences = {
      ...defaults,
      map: { ...defaults.map, artillery: true, watchtower: true },
    };
    expect(isMatchPreferences(oldPreferences)).toBe(true);
    expect(readMatchPreferences({ getItem: () => JSON.stringify(oldPreferences) }).map).toEqual(
      defaults.map,
    );
    const { mountains: _mountains, ...withoutMountains } = defaults.map;
    const olderPreferences = { ...defaults, map: withoutMountains };
    expect(isMatchPreferences(olderPreferences)).toBe(false);
    expect(readMatchPreferences({ getItem: () => JSON.stringify(olderPreferences) })).toEqual(
      defaults,
    );
  });
  it('migrates legacy combined Home settings without changing existing round metadata', () => {
    const legacy = { ...defaultMatchPreferences(), map: { ...DEFAULT_MAP_SETTINGS, cities: 30 } };
    expect(isMatchPreferences(legacy)).toBe(true);
    expect(readMatchPreferences({ getItem: () => JSON.stringify(legacy) }).map).toMatchObject({
      layout: 'mountains',
      river: false,
      mountains: true,
      cities: 30,
    });
    expect(legacy.map.river).toBe(true);
  });
  it('round-trips Courtyard preferences and rejects incompatible generated metadata', () => {
    const value = {
      ...defaultMatchPreferences(),
      map: { ...DEFAULT_MAP_SETTINGS, layout: 'courtyard' as const, cities: 30, enemies: 1 },
    };
    expect(readMatchPreferences({ getItem: () => JSON.stringify(value) })).toEqual(value);
    expect(isMatchPreferences({ ...value, map: { ...value.map, enemies: 2 } })).toBe(false);
    expect(isMatchPreferences({ ...value, map: { ...value.map, cities: 19 } })).toBe(false);
  });
  it('rejects unknown factions, upgrades, behaviors and malformed selections', () => {
    const base = defaultMatchPreferences();
    for (const patch of [
      { upgrades: { player: ['cheat'] } },
      { upgrades: { player: 'industry' } },
      { upgrades: { nobody: [] } },
      { aiBehaviors: { player: 'balanced' } },
      { aiBehaviors: { enemy: 'impossible' } },
      { map: { ...base.map, river: 'on' } },
    ])
      expect(isMatchPreferences({ ...base, ...patch })).toBe(false);
  });
});
