import { describe, expect, it, vi } from 'vitest';
import { drawCaptureShields, hasShieldFlash } from './drawCaptureShields';
import { createSimulation } from '../game/state';
import { featureLabels } from './featureLabels';
import type { CaptureShieldState, SimulationState } from '../game/types';

function render(shield?: CaptureShieldState, elapsedMs = 0, reducedMotion = false) {
  const state: SimulationState = { ...createSimulation([{ id: 'city', owner: 'player', units: 12, x: 105, y: 91 }]),
    elapsedMs, captureShields: shield ? { city: shield } : {} };
  const ctx = { save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), stroke: vi.fn(), globalAlpha: 1 };
  drawCaptureShields(ctx as unknown as CanvasRenderingContext2D, state, 360, 480, reducedMotion);
  return { ctx, state };
}

describe('Capture shield arcs', () => {
  it('draws three compact arcs for three charges without changing city geometry', () => {
    const { ctx } = render({ remaining: 3 });
    expect(ctx.arc).toHaveBeenCalledTimes(3);
    expect(ctx.arc.mock.calls.every(call => call[2] === 23)).toBe(true);
    expect(ctx.arc.mock.calls.every(call => Math.abs(call[4] - call[3] - 96 * Math.PI / 180) < 1e-10)).toBe(true);
    expect(ctx.save).toHaveBeenCalledOnce(); expect(ctx.restore).toHaveBeenCalledOnce();
  });
  it('removes one arc per blocked batch and draws no depleted or starting shield', () => {
    expect(render({ remaining: 2 }).ctx.arc).toHaveBeenCalledTimes(2);
    expect(render({ remaining: 1 }).ctx.arc).toHaveBeenCalledOnce();
    expect(render({ remaining: 0 }).ctx.arc).not.toHaveBeenCalled();
    expect(render().ctx.arc).not.toHaveBeenCalled();
  });
  it('briefly flashes consumed arcs using simulation time, then disappears', () => {
    const shield = { remaining: 0, blockedAt: 100, blockedFrom: 3 };
    const flash = render(shield, 200);
    expect(flash.ctx.arc).toHaveBeenCalledTimes(3);
    expect(hasShieldFlash(flash.state)).toBe(true);
    const ended = render(shield, 750);
    expect(ended.ctx.arc).not.toHaveBeenCalled();
    expect(hasShieldFlash(ended.state)).toBe(false);
    expect(render(shield, 200, true).ctx.arc).not.toHaveBeenCalled();
  });
  it('reports remaining batches separately from garrison units including depletion', () => {
    const city = { id: 'city', owner: 'player', units: 12, x: 105, y: 91 };
    expect(featureLabels(city, { remaining: 2 })).toContain('Capture shield: 2 of 3 charges (blocks 2 hostile batches).');
    expect(featureLabels(city, { remaining: 0 })).toContain('Capture shield depleted.');
    expect(featureLabels(city)).not.toContain('shield');
  });
});
