import { describe, expect, it } from 'vitest';
import { cityControlsModel, type CityControlsState } from './cityControlsModel';

const base: CityControlsState = {
  name: 'Orchard', cityType: 'production', troops: 48, planePhase: null,
  capacity: 100, costs: { production: 10, defender: 20, airfield: 30, watchtower: 30, artillery: 40 }, targeting: null,
};
describe('city control presentation', () => {
  it('shows all five role prices and marks only the current role', () => {
    const model = cityControlsModel(base);
    expect(model.types.map(t => [t.type, t.cost, t.current, t.disabled])).toEqual([
      ['production', 10, true, true], ['defender', 20, false, false], ['airfield', 30, false, false],
      ['watchtower', 30, false, false], ['artillery', 40, false, false],
    ]);
    expect(model.currentText).toBe('✓');
  });
  it('requires the role cost plus one retained troop', () => {
    const model = cityControlsModel({ ...base, troops: 40 });
    expect(model.types[4].reason).toBe('Need 41 troops; leave 1 behind.');
    expect(model.types[4].disabled).toBe(true);
    expect(cityControlsModel({ ...base, troops: 41 }).types[4].disabled).toBe(false);
  });
  it.each(['outbound', 'unloading', 'returning'] as const)('blocks role changes and flight during %s but not ground', planePhase => {
    const model = cityControlsModel({ ...base, cityType: 'airfield', planePhase });
    expect(model.types.filter(type => !type.current).every(t => t.disabled)).toBe(true);
    expect(model.flyDisabled).toBe(true);
    expect(model.reason).toContain('plane is away');
  });
  it.each(['preparing', 'turnaround'] as const)('permits role changes but not flight during %s', planePhase => {
    const model = cityControlsModel({ ...base, cityType: 'airfield', planePhase });
    expect(model.types.find(type => type.type === 'production')!.disabled).toBe(false);
    expect(model.flyDisabled).toBe(true);
  });
  it('shows compact current weapon statuses while retaining detailed accessible descriptions', () => {
    expect(cityControlsModel({ ...base, cityType: 'watchtower' }).currentText).toBe('4/s');
    expect(cityControlsModel({ ...base, cityType: 'artillery' }).currentText).toBe('3/s');
    expect(cityControlsModel({ ...base, cityType: 'defender', detail: '2/3 shields · defender recharge 10s' }).currentText).toBe('2/3 shields');
  });
  it('shows capacity and distinct garrison/boarding count', () => {
    const model = cityControlsModel({ ...base, cityType: 'airfield', troops: 126, planePhase: 'ready' });
    expect(model.planeText).toBe('Plane ready · capacity 100');
    expect(model.flyReason).toBe('Board 100 troops; leave at least 1 behind.');
    expect(model.flyDisabled).toBe(false);
    expect(cityControlsModel({ ...base, cityType: 'airfield', troops: 1, planePhase: 'ready' }).flyDisabled).toBe(true);
  });
  it('disables role changes during either target mode', () => {
    for (const targeting of ['fly', 'ground'] as const) {
      const model = cityControlsModel({ ...base, targeting });
      expect(model.types.filter(type => !type.current).every(t => t.disabled)).toBe(true);
      expect(model.reason).toContain('Cancel');
    }
  });
});
