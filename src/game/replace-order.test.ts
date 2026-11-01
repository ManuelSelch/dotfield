import { describe, expect, it } from 'vitest';

import { dispatchUnits } from './dispatch';
import { createSimulation } from './state';
import { advanceTravel } from './travel';

const cities = [
  { id: 'source', owner: 'player' as const, units: 21, x: 0, y: 0 },
  { id: 'old', owner: 'neutral' as const, units: 10, x: 300, y: 0 },
  { id: 'new', owner: 'neutral' as const, units: 10, x: 0, y: 300 },
];

describe('replacement orders', () => {
  it('replaces queued groups with all remaining defenders except one, preserving airborne groups', () => {
    const initial = dispatchUnits(createSimulation(cities), 'source', 'old');
    const next = dispatchUnits(initial, 'source', 'new');
    expect(next.transfers.filter((t) => t.targetId === 'old')).toEqual([initial.transfers[0]]);
    expect(
      next.transfers.filter((t) => t.targetId === 'new').reduce((sum, t) => sum + t.units, 0),
    ).toBe(15);
    expect(next.territories[0].units).toBe(11);
    expect(next.transfers.filter((t) => t.targetId === 'new').map((t) => t.elapsedMs)).toEqual([
      0, -600, -1200,
    ]);
    expect(new Set(next.transfers.map((t) => t.id)).size).toBe(next.transfers.length);
    expect(initial.transfers).toHaveLength(4);
  });
  it('preserves every launched group, not just the first', () => {
    const initial = advanceTravel(dispatchUnits(createSimulation(cities), 'source', 'old'), 650);
    const flying = initial.transfers.filter((t) => t.elapsedMs >= 0);
    expect(flying).toHaveLength(2);
    const next = dispatchUnits(initial, 'source', 'new');
    expect(next.transfers.filter((t) => t.targetId === 'old')).toEqual(flying);
    expect(
      next.transfers.filter((t) => t.targetId === 'new').reduce((sum, t) => sum + t.units, 0),
    ).toBe(10);
  });
  it('does not cancel queues for invalid orders', () => {
    const initial = dispatchUnits(createSimulation(cities), 'source', 'old');
    expect(dispatchUnits(initial, 'source', 'source')).toBe(initial);
    expect(dispatchUnits(initial, 'source', 'missing')).toBe(initial);
    expect(dispatchUnits(initial, 'old', 'new')).toBe(initial);
    expect(dispatchUnits({ ...initial, roundStatus: 'victory' }, 'source', 'new').transfers).toBe(
      initial.transfers,
    );
  });
  it('applies the same replacement rule to opponent orders', () => {
    const initial = dispatchUnits(
      createSimulation(cities.map((n) => ({ ...n, owner: n.id === 'source' ? 'enemy' : n.owner }))),
      'source',
      'old',
      'enemy',
    );
    const next = dispatchUnits(initial, 'source', 'new', 'enemy');
    expect(next.transfers.filter((t) => t.targetId === 'old')).toHaveLength(1);
    expect(
      next.transfers.filter((t) => t.targetId === 'new').reduce((sum, t) => sum + t.units, 0),
    ).toBe(15);
  });
});
