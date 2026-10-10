import type { Terrain } from '../game/terrain/types';
import { FIELD } from './layout';

export function drawMountains(ctx: CanvasRenderingContext2D, terrain: Terrain | undefined, width: number, height: number) {
  if (!terrain) return;
  const scale = Math.min(width / FIELD.width, height / FIELD.height);
  const offsetX = (width - FIELD.width * scale) / 2, offsetY = (height - FIELD.height * scale) / 2;
  ctx.save(); ctx.translate(offsetX, offsetY); ctx.scale(scale, scale);
  for (const barrier of terrain.barriers) {
    if (barrier.kind !== 'mountain') continue;
    const b = barrier.bounds, w = b.maxX - b.minX, h = b.maxY - b.minY;
    ctx.fillStyle = '#d5d8cd'; ctx.strokeStyle = '#a8afa0'; ctx.lineWidth = 1;
    ctx.fillRect(b.minX, b.minY, w, h);
    ctx.strokeRect(b.minX, b.minY, w, h);

    // Keep the physical footprint rectangular, but give the ridge a faceted range silhouette.
    ctx.beginPath();
    ctx.moveTo(b.minX + w * 0.04, b.minY + h * 0.78);
    ctx.lineTo(b.minX + w * 0.2, b.minY + h * 0.46);
    ctx.lineTo(b.minX + w * 0.34, b.minY + h * 0.62);
    ctx.lineTo(b.minX + w * 0.53, b.minY + h * 0.16);
    ctx.lineTo(b.minX + w * 0.71, b.minY + h * 0.57);
    ctx.lineTo(b.minX + w * 0.86, b.minY + h * 0.31);
    ctx.lineTo(b.minX + w * 0.96, b.minY + h * 0.76);
    ctx.lineTo(b.minX + w * 0.96, b.minY + h * 0.9);
    ctx.lineTo(b.minX + w * 0.04, b.minY + h * 0.9);
    ctx.closePath();
    ctx.fillStyle = '#c3c9bb'; ctx.fill(); ctx.strokeStyle = '#a8afa0'; ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(b.minX + w * 0.44, b.minY + h * 0.37);
    ctx.lineTo(b.minX + w * 0.53, b.minY + h * 0.16);
    ctx.lineTo(b.minX + w * 0.62, b.minY + h * 0.37);
    ctx.lineTo(b.minX + w * 0.55, b.minY + h * 0.32);
    ctx.lineTo(b.minX + w * 0.51, b.minY + h * 0.37);
    ctx.closePath();
    ctx.fillStyle = '#eef0e8'; ctx.fill(); ctx.strokeStyle = '#a8afa0'; ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(b.minX + w * 0.79, b.minY + h * 0.43);
    ctx.lineTo(b.minX + w * 0.86, b.minY + h * 0.31);
    ctx.lineTo(b.minX + w * 0.92, b.minY + h * 0.48);
    ctx.lineTo(b.minX + w * 0.87, b.minY + h * 0.44);
    ctx.lineTo(b.minX + w * 0.83, b.minY + h * 0.47);
    ctx.closePath();
    ctx.fillStyle = '#eef0e8'; ctx.fill(); ctx.strokeStyle = '#a8afa0'; ctx.stroke();
  }
  ctx.restore();
}
