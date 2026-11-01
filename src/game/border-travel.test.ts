import { describe, expect, it } from 'vitest';

import { resolveCombat } from './combat';
import { dispatchUnits } from './dispatch';
import { TRAVEL_SPEED, TERRITORY_RADIUS } from './settings';
import { createSimulation } from './state';
import { advanceTravel } from './travel';

const nodes = [
  { id: 'source', owner: 'player' as const, units: 11, x: 0, y: 0 },
  { id: 'target', owner: 'neutral' as const, units: 12, x: 200, y: 0 },
];

describe('border-to-border travel', () => {
  it('launches at the source edge and ends at the target edge', () => {
    const batch = dispatchUnits(createSimulation(nodes), 'source', 'target').transfers[0];
    expect(batch.from).toEqual({ x: TERRITORY_RADIUS, y: 0 });
    expect(batch.to).toEqual({ x: 200 - TERRITORY_RADIUS, y: 0 });
    expect(batch.durationMs).toBeCloseTo(((200 - 2 * TERRITORY_RADIUS) / TRAVEL_SPEED) * 1000);
  });

  it('applies combat at the border before a center-to-center flight would finish', () => {
    let state = dispatchUnits(createSimulation(nodes), 'source', 'target');
    const borderHitMs = ((200 - 2 * TERRITORY_RADIUS) / TRAVEL_SPEED) * 1000;
    state = resolveCombat(advanceTravel(state, borderHitMs - 1));
    expect(state.territories[1].units).toBe(12);
    state = resolveCombat(advanceTravel(state, 1));
    expect(state.territories[1]).toMatchObject({ owner: 'neutral', units: 7 });
    expect(state.transfers).toHaveLength(1);
  });

  it.each([
    [180, 55],
    [177, 229],
    [-100, -100],
  ])('uses the correct edges in direction %i,%i', (x, y) => {
    const batch = dispatchUnits(
      createSimulation([nodes[0], { ...nodes[1], x, y }]),
      'source',
      'target',
    ).transfers[0];
    expect(Math.hypot(batch.from.x, batch.from.y)).toBeCloseTo(TERRITORY_RADIUS);
    expect(Math.hypot(batch.to.x - x, batch.to.y - y)).toBeCloseTo(TERRITORY_RADIUS);
  });
});
