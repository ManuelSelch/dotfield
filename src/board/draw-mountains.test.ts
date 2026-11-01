import { describe, expect, it, vi } from 'vitest';

import { createTerrain } from '@/game/terrain/terrain';

import { drawMountains } from './draw-mountains';

const ctx = () => ({
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
});
const terrain = createTerrain({
  bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 },
  barriers: [
    {
      id: 'mountain-range',
      kind: 'mountain',
      bounds: { minX: 140, minY: 270, maxX: 220, maxY: 370 },
    },
  ],
  crossings: [],
});

describe('mountain rendering', () => {
  it('renders a faceted mountain range without pass-name text', () => {
    const canvas = ctx();
    drawMountains(canvas as unknown as CanvasRenderingContext2D, terrain, 360, 480);
    expect(canvas.fillRect).toHaveBeenCalledWith(140, 270, 80, 100);
    expect(canvas.lineTo.mock.calls.length).toBeGreaterThanOrEqual(8);
    expect(canvas.fillText).not.toHaveBeenCalled();
    expect(canvas.restore).toHaveBeenCalledOnce();
  });
  it('does not draw terrain when none is present', () => {
    const canvas = ctx();
    drawMountains(canvas as unknown as CanvasRenderingContext2D, undefined, 360, 480);
    expect(canvas.fillRect).not.toHaveBeenCalled();
  });
});
