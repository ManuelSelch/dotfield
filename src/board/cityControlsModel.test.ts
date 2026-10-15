import { describe, expect, it } from 'vitest';
import { cityControlsModel, type CityControlsState } from './cityControlsModel';

const base: CityControlsState = {
  name: 'Orchard', cityType: 'production', troops: 48, planePhase: null,
  capacity: 100, costs: { production: 10, defender: 20, airfield: 30 }, targeting: null,
};
describe('city control presentation', () => {
  it('highlights the current type without charging and displays all prices', () => {
    const model = cityControlsModel(base);
    expect(model.types.map(t => [t.type, t.cost, t.current, t.disabled])).toEqual([
      ['production', 10, true, true], ['defender', 20, false, false], ['airfield', 30, false, false],
    ]);
    expect(model.types[0].reason).toBe('Current · no charge');
  });
  it('requires the full cost plus one retained troop', () => {
    const model = cityControlsModel({ ...base, troops: 20 });
    expect(model.types[1].reason).toBe('Need 21 troops; leave 1 behind.');
    expect(model.types[1].disabled).toBe(true);
    expect(cityControlsModel({ ...base, troops: 21 }).types[1].disabled).toBe(false);
  });
  it.each(['outbound', 'unloading', 'returning'] as const)('blocks conversion and flight during %s but not ground', planePhase => {
    const model = cityControlsModel({ ...base, cityType: 'airfield', planePhase });
    expect(model.types.every(t => t.disabled)).toBe(true);
    expect(model.flyDisabled).toBe(true);
    expect(model.groundDisabled).toBe(false);
    expect(model.reason).toContain('plane is away');
  });
  it.each(['preparing', 'turnaround'] as const)('permits conversion but not flight during %s', planePhase => {
    const model = cityControlsModel({ ...base, cityType: 'airfield', planePhase });
    expect(model.types[0].disabled).toBe(false);
    expect(model.flyDisabled).toBe(true);
  });
  it('shows capacity and distinct garrison/boarding count', () => {
    const model = cityControlsModel({ ...base, cityType: 'airfield', troops: 126, planePhase: 'ready' });
    expect(model.planeText).toBe('Plane ready · capacity 100');
    expect(model.flyReason).toBe('Board 100 troops; leave at least 1 behind.');
    expect(model.flyDisabled).toBe(false);
    expect(cityControlsModel({ ...base, cityType: 'airfield', troops: 1, planePhase: 'ready' }).flyDisabled).toBe(true);
  });
  it('disables type changes during either target mode', () => {
    for (const targeting of ['fly', 'ground'] as const) {
      const model = cityControlsModel({ ...base, targeting });
      expect(model.types.every(t => t.disabled)).toBe(true);
      expect(model.reason).toContain('Cancel');
    }
  });
});
