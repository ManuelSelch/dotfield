import { describe, expect, it, vi } from 'vitest';

import { TERRITORY_RADIUS } from '@/game/settings';
import { createSimulation } from '@/game/state';
import type { CaptureShieldState, SimulationState } from '@/game/types';

import { drawCaptureShields, hasShieldFlash } from './draw-capture-shields';
import { featureLabels } from './feature-labels';

function render(shield?: CaptureShieldState, elapsedMs = 0, reducedMotion = false) {
  const state: SimulationState = {
    ...createSimulation([{ id: 'city', owner: 'player', units: 12, x: 105, y: 91 }]),
    elapsedMs,
    captureShields: shield ? { city: shield } : {},
  };
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    globalAlpha: 1,
  };
  drawCaptureShields(ctx as unknown as CanvasRenderingContext2D, state, 360, 480, reducedMotion);
  return { ctx, state };
}

describe('Capture shield arcs', () => {
  it('draws three compact arcs for three charges without changing city geometry', () => {
    const { ctx } = render({ remaining: 3 });
    expect(ctx.arc).toHaveBeenCalledTimes(3);
    expect(ctx.arc.mock.calls.every((call) => call[2] === TERRITORY_RADIUS + 6)).toBe(true);
    expect(
      ctx.arc.mock.calls.every(
        (call) => Math.abs(call[4] - call[3] - (96 * Math.PI) / 180) < 1e-10,
      ),
    ).toBe(true);
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
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
    expect(featureLabels(city, { remaining: 2 })).toContain(
      'Shields: 2 active charges; each blocks one hostile troop-arrival batch.',
    );
    expect(featureLabels(city, { remaining: 0 })).toContain('Shields depleted.');
    expect(featureLabels(city, { remaining: 1 }, 3)).toContain('1 stored (capacity 3)');
    expect(featureLabels(city)).not.toContain('shield');
  });
});
