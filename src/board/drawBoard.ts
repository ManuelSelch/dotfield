import type { SimulationState } from '../game/types';
import type { DragSelection } from './drag';
import { drawTerritories } from './drawTerritories';
import { drawDrag } from './drawDrag';
import { drawTransfers } from './drawTransfers';

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
  ctx.fillStyle = '#dde2d8';
  for (let x = 12; x < width; x += 24) {
    for (let y = 12; y < height; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Territories mask the dot edges at launch/impact, keeping counters unobstructed.
  drawTransfers(ctx, state, width, height);
  drawTerritories(ctx, state, width, height);
  drawDrag(ctx, state.territories, selection, width, height);
}
