import type { Terrain } from '../game/terrain/types';
import { FIELD } from './layout';

export function drawMountains(ctx: CanvasRenderingContext2D, terrain: Terrain | undefined, width: number, height: number) {
  if (!terrain) return;
  const scale = Math.min(width / FIELD.width, height / FIELD.height);
  const offsetX = (width - FIELD.width * scale) / 2, offsetY = (height - FIELD.height * scale) / 2;
  ctx.save(); ctx.translate(offsetX, offsetY); ctx.scale(scale, scale);
  for (const barrier of terrain.barriers) {
    if (barrier.kind !== 'mountain') continue;
    const b = barrier.bounds;
    ctx.fillStyle = '#d5d8cd'; ctx.strokeStyle = '#a8afa0'; ctx.lineWidth = 1;
    ctx.fillRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
    ctx.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
    const x = (b.minX + b.maxX) / 2, y = (b.minY + b.maxY) / 2;
    ctx.strokeStyle = '#9ca692'; ctx.beginPath(); ctx.moveTo(x - 7, y + 8); ctx.lineTo(x, y - 9); ctx.lineTo(x + 7, y + 8); ctx.stroke();
  }
  ctx.restore();
}
