import { expect, it } from 'vitest';

import { DEFAULT_MAP_SETTINGS } from './generate-map';
import { selectLayout, layoutOf } from './layout-settings';

it('switches to Courtyard without permitting incompatible counts or factions', () => {
  const settings = selectLayout({ ...DEFAULT_MAP_SETTINGS, enemies: 4 }, 'courtyard');
  expect(settings).toMatchObject({
    layout: 'courtyard',
    cities: 20,
    enemies: 1,
    river: true,
    mountains: true,
  });
  expect(selectLayout({ ...settings, cities: 30 }, 'river')).toMatchObject({
    layout: 'river',
    cities: 30,
    river: true,
    mountains: false,
  });
});
it('maps legacy combined terrain to Mountains rather than silently enabling Courtyard', () => {
  expect(layoutOf(DEFAULT_MAP_SETTINGS)).toBe('mountains');
  expect(layoutOf({ ...DEFAULT_MAP_SETTINGS, mountains: false })).toBe('river');
  expect(layoutOf({ ...DEFAULT_MAP_SETTINGS, mountains: false, river: false })).toBe('open');
});
