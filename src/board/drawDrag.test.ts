import { expect, it, vi } from 'vitest';
import { drawDrag } from './drawDrag';
import { TERRITORIES } from './map';
import { RIVER_MAP } from './riverMap';

it('draws selection feedback without a numeric dispatch label', () => {
  const ctx = {
    save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(), beginPath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fillText: vi.fn(),
  };
  drawDrag(ctx as unknown as CanvasRenderingContext2D, TERRITORIES,
    { sourceId: 'south', targetId: 'centre', point: { x: 177, y: 229 } }, 360, 480);
  expect(ctx.lineTo).toHaveBeenCalled();
  expect(ctx.arc).toHaveBeenCalledTimes(2);
  expect(ctx.fillText).not.toHaveBeenCalled();
});

it('previews paired bridge orders at city borders and marks forbidden cross-bank orders red', () => {
  const ctx = { save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(), beginPath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), strokeStyle: '', fillText: vi.fn() };
  drawDrag(ctx as unknown as CanvasRenderingContext2D, RIVER_MAP.territories,
    { sourceId: 'west-south', targetId: 'west-north', point: { x: 80, y: 190 } }, 360, 480, RIVER_MAP.river);
  expect(ctx.moveTo).toHaveBeenCalledWith(80, 276);
  expect(ctx.lineTo).toHaveBeenCalledWith(80, 204);
  expect(ctx.arc).toHaveBeenCalledWith(80, 190, 20, 0, Math.PI * 2);
  drawDrag(ctx as unknown as CanvasRenderingContext2D, RIVER_MAP.territories,
    { sourceId: 'west-south', targetId: 'north', point: { x: 180, y: 50 } }, 360, 480, RIVER_MAP.river);
  expect(ctx.strokeStyle).toBe('#bd655f');
  expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
});
