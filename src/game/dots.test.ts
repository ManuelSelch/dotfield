import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { dispatchUnits } from './dispatch';
import { dotPosition } from './dots';

function group() {
  return dispatchUnits(createSimulation([
    { id: 'source', owner: 'player', units: 6, x: 0, y: 100 },
    { id: 'target', owner: 'enemy', units: 20, x: 300, y: 100 },
  ]), 'source', 'target').transfers[0];
}

describe('shared per-dot geometry', () => {
  it('assigns stable slots to each unit', () => {
    expect(group().dotSlots).toEqual([0, 1, 2, 3, 4]);
    expect(group().formationSize).toBe(5);
  });
  it.each([[0, 0], [0.15, 36], [0.3, 72], [0.5, 72], [0.9, 36], [1, 0]])(
    'uses the existing opening/convergence at progress %s', (progress, width) => {
      const batch = group();
      const at = batch.durationMs * progress;
      expect(dotPosition(batch, 4, at).y - dotPosition(batch, 0, at).y).toBeCloseTo(width);
    });
  it('does not recenter surviving dots after another dot is destroyed', () => {
    const original = group();
    const reduced = { ...original, units: 3, dotSlots: [0, 2, 4] };
    for (const slot of reduced.dotSlots) {
      expect(dotPosition(reduced, slot, original.durationMs / 2))
        .toEqual(dotPosition(original, slot, original.durationMs / 2));
    }
  });
});
