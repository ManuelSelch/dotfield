import type { SimulationState } from '../game/types';
import type { DragSelection } from './drag';
import { drawTerritories } from './drawTerritories';
import { drawCityFeatures } from './drawCityFeatures';
import { drawDrag } from './drawDrag';
import { drawTransfers } from './drawTransfers';
import { createRegionCache } from './regions/cache';
import { drawRegions } from './regions/drawRegions';

const regionCaches = new WeakMap<HTMLCanvasElement, ReturnType<typeof createRegionCache>>();

export function drawBoard(
  canvas: HTMLCanvasElement, state: SimulationState,
  width: number, height: number, pixelRatio: number, selection: DragSelection | null = null,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || width <= 0 || height <= 0) return;
  const backingWidth = Math.round(width * pixelRatio);
  const backingHeight = Math.round(height * pixelRatio);
  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  let getRegions = regionCaches.get(canvas);
  if (!getRegions) { getRegions = createRegionCache(); regionCaches.set(canvas, getRegions); }
  drawRegions(ctx, state.territories, getRegions(state.territories, width, height), selection);
  ctx.fillStyle = '#c4cec2';
  ctx.globalAlpha = 0.5;
  for (let x = 12; x < width; x += 24) {
    for (let y = 12; y < height; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Territories mask the dot edges at launch/impact, keeping counters unobstructed.
  drawTransfers(ctx, state, width, height);
  drawTerritories(ctx, state, width, height);
  drawCityFeatures(ctx, state, width, height);
  drawDrag(ctx, state.territories, selection, width, height);
}
