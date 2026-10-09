import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { dispatchUnits } from './dispatch';
import { advanceTravel } from './travel';
import { BATCH_INTERVAL_MS } from './settings';
import { resolveCombat } from './combat';

const map = [
  { id: 'source', owner: 'player' as const, units: 21, x: 0, y: 0 },
  { id: 'target', owner: 'enemy' as const, units: 20, x: 300, y: 0 },
];
const accounted = (state: ReturnType<typeof createSimulation>) =>
  state.territories.reduce((sum, n) => sum + n.units, 0)
  + state.transfers.filter(t => t.elapsedMs >= 0).reduce((sum, t) => sum + t.units, 0)
  + state.arrivals.reduce((sum, t) => sum + t.units, 0);

describe('deducting on batch launch', () => {
  it('deducts the first group immediately, then the next group at its launch time', () => {
    const original = createSimulation(map);
    let state = dispatchUnits(original, 'source', 'target');
    expect(state.territories[0].units).toBe(16);
    expect(state.transfers.filter(t => t.elapsedMs < 0)).toHaveLength(3);
    expect(accounted(state)).toBe(41);
    state = advanceTravel(state, BATCH_INTERVAL_MS - 1);
    expect(state.territories[0].units).toBe(16);
    state = advanceTravel(state, 1);
    expect(state.territories[0].units).toBe(11);
    expect(accounted(state)).toBe(41);
    state = advanceTravel(state, 2 * BATCH_INTERVAL_MS);
    expect(state.territories[0].units).toBe(1);
    expect(state.transfers.filter(t => t.elapsedMs < 0)).toHaveLength(0);
    expect(accounted(state)).toBe(41);
    expect(original.territories[0].units).toBe(21);
  });

  it('replaces reservations without duplicating or losing units', () => {
    let state = dispatchUnits(createSimulation(map), 'source', 'target');
    const original = state;
    state = dispatchUnits(state, 'source', 'target');
    expect(state.transfers[0]).toBe(original.transfers[0]);
    expect(state.transfers.slice(1).every(t => t.id >= original.nextTransferId)).toBe(true);
    expect(state.transfers.map(t => t.units)).toEqual([5, 5, 5, 5]);
    expect(accounted(state)).toBe(41);
  });

  it('cancels unlaunched groups if the source changes owner; airborne units still travel', () => {
    const sent = dispatchUnits(createSimulation(map), 'source', 'target');
    const captured = { ...sent, territories: sent.territories.map(n => n.id === 'source'
      ? { ...n, owner: 'enemy' as const, units: 2 } : n) };
    const next = advanceTravel(captured, BATCH_INTERVAL_MS);
    expect(next.transfers).toHaveLength(1);
    expect(next.territories[0]).toMatchObject({ owner: 'enemy', units: 2 });
  });

  it('cancels reservations immediately when combat captures their source', () => {
    const sent = dispatchUnits(createSimulation(map), 'source', 'target');
    const captured = resolveCombat({ ...sent, arrivals: [{ ...sent.transfers[0], owner: 'enemy', targetId: 'source', units: 20 }] });
    expect(captured.territories[0]).toMatchObject({ owner: 'enemy', units: 4 });
    expect(captured.transfers).toHaveLength(1);
    expect(captured.transfers[0].elapsedMs).toBe(0);
  });

  it('does not produce negative counts if defenders are depleted before launch', () => {
    const sent = dispatchUnits(createSimulation(map), 'source', 'target');
    const damaged = { ...sent, territories: sent.territories.map(n => n.id === 'source' ? { ...n, units: 3 } : n) };
    const next = advanceTravel(damaged, BATCH_INTERVAL_MS);
    expect(next.territories[0].units).toBe(1);
    expect(next.transfers[1].units).toBe(2);
    expect(accounted(next)).toBe(accounted(damaged));
  });
});
