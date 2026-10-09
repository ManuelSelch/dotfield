import { describe, expect, it, vi } from 'vitest';
import { createSimulation } from '../game/state';
import { dispatchUnits } from '../game/dispatch';
import { drawTransfers } from './drawTransfers';

function render(progress: number) {
  const launched = dispatchUnits(createSimulation([
    { id: 'source', owner: 'player', units: 10, x: 0, y: 100 },
    { id: 'target', owner: 'neutral', units: 20, x: 300, y: 100 },
  ]), 'source', 'target');
  const transfer = launched.transfers[0];
  const state = { ...launched, transfers: [{ ...transfer, elapsedMs: transfer.durationMs * progress }] };
  const arc = vi.fn();
  const ctx = { save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), fill: vi.fn(), arc };
  drawTransfers(ctx as unknown as CanvasRenderingContext2D, state, 360, 480);
  return { state, arc };
}

describe('batch convergence', () => {
  it.each([0, 0.5, 0.8])('keeps normal spacing at progress %s', progress => {
    const { arc } = render(progress);
    expect(arc.mock.calls).toHaveLength(5);
    expect(arc.mock.calls[4][1] - arc.mock.calls[0][1]).toBeCloseTo(72);
  });

  it.each([[0.9, 36], [1, 0]])('converges at progress %s to a row width of %s', (progress, width) => {
    const { state, arc } = render(progress);
    expect(arc.mock.calls).toHaveLength(5);
    expect(arc.mock.calls[4][1] - arc.mock.calls[0][1]).toBeCloseTo(width);
    expect(arc.mock.calls.every(call => call[2] === 7.2)).toBe(true);
    expect(state.territories[1]).toMatchObject({ owner: 'neutral', units: 20 });
    expect(state.transfers[0].units).toBe(5);
  });
});
