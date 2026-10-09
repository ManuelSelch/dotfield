import { describe, expect, it, vi } from 'vitest';
import { createSimulation } from '../game/state';
import { dispatchUnits } from '../game/dispatch';
import { drawTransfers } from './drawTransfers';

function render(progress: number, slots = [0, 1, 2, 3, 4], width = 360, height = 480) {
  const launched = dispatchUnits(createSimulation([
    { id: 'source', owner: 'player', units: 10, x: 0, y: 100 },
    { id: 'target', owner: 'neutral', units: 20, x: 300, y: 100 },
  ]), 'source', 'target');
  const transfer = launched.transfers[0];
  const state = { ...launched, transfers: [{ ...transfer, units: slots.length, dotSlots: slots, elapsedMs: transfer.durationMs * progress }] };
  const arc = vi.fn();
  const ctx = { save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), fill: vi.fn(), arc };
  drawTransfers(ctx as unknown as CanvasRenderingContext2D, state, width, height);
  return { state, arc };
}

describe('batch spreading and convergence', () => {
  it('draws only surviving slots without closing holes in the formation', () => {
    const full = render(0.5).arc.mock.calls;
    const survivors = render(0.5, [0, 2, 4]).arc.mock.calls;
    expect(survivors).toEqual([full[0], full[2], full[4]]);
  });
  it('scales dot size and spacing together with the same board geometry', () => {
    const normal = render(0.5).arc.mock.calls;
    const doubled = render(0.5, undefined, 720, 960).arc.mock.calls;
    for (let i = 0; i < normal.length; i++) {
      expect(doubled[i].slice(0, 3)).toEqual(normal[i].slice(0, 3).map(value => value * 2));
    }
  });

  it.each([[0, 0], [0.15, 36], [0.3, 72]])('spreads after launch at progress %s to width %s', (progress, width) => {
    const { arc } = render(progress);
    expect(arc.mock.calls).toHaveLength(5);
    expect(arc.mock.calls[4][1] - arc.mock.calls[0][1]).toBeCloseTo(width);
  });

  it.each([0.5, 0.8])('keeps normal spacing at progress %s', progress => {
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
