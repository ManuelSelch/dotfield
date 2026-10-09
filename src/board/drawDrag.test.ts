import { expect, it, vi } from 'vitest';
import { drawDrag } from './drawDrag';
import { TERRITORIES } from './map';

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
