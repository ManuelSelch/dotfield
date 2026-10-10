import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_SETTINGS, generateMap, type MapSettings } from './generateMap';
import { canRiverOrder } from '../game/river';
import { canDirectTerrainOrder } from '../game/terrain/directOrder';

const settings = (mountains: boolean): MapSettings => ({ ...DEFAULT_MAP_SETTINGS, mountains, artillery: false });

describe('generated mountain setting', () => {
  it('defaults Mountains on and exposes its setting with the map', () => {
    const map = generateMap(DEFAULT_MAP_SETTINGS, 12);
    expect(DEFAULT_MAP_SETTINGS.mountains).toBe(true);
    expect(map.settings.mountains).toBe(true);
    expect(map.terrain?.barriers).toContainEqual(expect.objectContaining({ id: 'mountain-range', kind: 'mountain' }));
  });

  it('removes only the central ridge when Mountains is off and keeps legal playability', () => {
    const on = generateMap(settings(true), 28);
    const off = generateMap(settings(false), 28);
    expect(off.settings.mountains).toBe(false);
    expect(off.terrain).toBeUndefined();
    expect(off.river).toEqual(on.river);
    expect(off.territories).not.toEqual(on.territories);
    const reachable = new Set([off.territories[0].id]);
    for (let pass = 0; pass < off.territories.length; pass++) for (const source of off.territories) if (reachable.has(source.id))
      for (const target of off.territories) if (canRiverOrder(source, target, off.river)
        && canDirectTerrainOrder(source, target, off.terrain)) reachable.add(target.id);
    expect(reachable.size).toBe(off.territories.length);
  });

  it('rejects a missing or non-boolean Mountains choice', () => {
    const { mountains: _mountains, ...missing } = settings(true);
    expect(() => generateMap(missing as MapSettings, 1)).toThrow();
    expect(() => generateMap({ ...settings(true), mountains: 'off' } as unknown as MapSettings, 1)).toThrow();
  });
});
