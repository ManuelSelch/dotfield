import { describe, expect, it, vi } from 'vitest';
import { drawRegions } from './drawRegions';
import { createCityRegions } from './geometry';
import { REGION_FILLS } from './styles';

const cities = [
  { id: 'left', owner: 'player' as const, units: 10, x: 90, y: 240 },
  { id: 'right', owner: 'enemy' as const, units: 10, x: 270, y: 240 },
];
function context() {
  const fills: string[] = [];
  const ctx = { fillStyle: '', save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
    lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn(), setLineDash: vi.fn(), fill: () => fills.push(ctx.fillStyle) };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills };
}

describe('city-region visuals', () => {
  it('fills regions by current ownership, not cached geometry ownership', () => {
    const cells = createCityRegions(cities, 360, 480);
    const first = context();
    drawRegions(first.ctx, cities, cells, null);
    expect(first.fills).toEqual([REGION_FILLS.player, REGION_FILLS.enemy]);
    const captured = cities.map(n => ({ ...n, owner: 'player' as const }));
    const next = context();
    drawRegions(next.ctx, captured, cells, null);
    expect(next.fills).toEqual([REGION_FILLS.player, REGION_FILLS.player]);
    expect(next.ctx.stroke).toHaveBeenCalledTimes(2); // Border remains between friendly cities.
  });
  it('draws one perimeter around connected cities without outlining their shared border', () => {
    const adjacent = [
      { id: 'left', owner: 'player' as const, units: 10, x: 0, y: 0 },
      { id: 'right', owner: 'player' as const, units: 10, x: 10, y: 0 },
    ];
    const cells = [
      { id: 'left', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] },
      { id: 'right', points: [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 10 }] },
    ];
    const { ctx } = context();
    drawRegions(ctx, adjacent, cells, null, undefined, undefined, new Set(['left', 'right']));
    // Three fill-edge segments per cell plus six segments on the merged outer perimeter.
    expect(ctx.lineTo).toHaveBeenCalledTimes(12);
  });

  it('highlights the whole source and target regions', () => {
    const { ctx, fills } = context();
    drawRegions(ctx, cities, createCityRegions(cities, 360, 480),
      { sourceId: 'left', targetId: 'right', point: { x: 270, y: 240 } });
    expect(fills).toEqual(['#c4e0d1', '#e8d9cb']);
    expect(ctx.stroke).toHaveBeenCalledTimes(4);
  });
});
