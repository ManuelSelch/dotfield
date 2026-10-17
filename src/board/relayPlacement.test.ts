import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_SETTINGS, generateMap, type MapLayout } from './generateMap';

it('does not change geography, starts, features or garrisons when Relay is enabled', () => {
  for (const layout of ['open', 'river', 'mountains', 'courtyard'] as const) {
    const settings = { ...DEFAULT_MAP_SETTINGS, layout, cities: 24, enemies: 1 };
    const plain = generateMap(settings, 42), relay = generateMap({ ...settings, relay: true }, 42);
    expect(relay.territories).toEqual(plain.territories);
    expect(relay.river).toEqual(plain.river);
    expect(relay.terrain).toEqual(plain.terrain);
    expect(plain.relay).toBeUndefined();
    expect(relay.relay).toMatchObject({ activateAtMs: 120000, targetMs: 180000 });
  }
});
describe.each(['open', 'river', 'mountains', 'courtyard'] as MapLayout[])('%s relay placement', layout => {
  it('selects a deterministic neutral host without replacing a starting home', () => {
    for (const seed of [0, 42, 314]) for (const cities of [6, 20, 30]) for (const enemies of [1, 4]) {
      if (layout === 'courtyard' && (cities < 20 || enemies > 1)) continue;
      const settings = { ...DEFAULT_MAP_SETTINGS, layout, cities, enemies, relay: true };
      const map = generateMap(settings, seed);
      const host = map.territories.find(c => c.id === map.relay?.cityId);
      expect(host?.owner).toBe('neutral');
      expect(host?.cityType ?? 'production').toBe('production');
      expect(generateMap(settings, seed).relay).toEqual(map.relay);
      if (layout === 'courtyard') expect(host?.id).toBe('courtyard');
    }
  });
});
