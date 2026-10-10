import type { Territory } from '../game/types';
import { bridgeDecks, type River } from '../game/river';
import { fieldTransform, screenPoint } from './layout';

export function drawRiver(ctx: CanvasRenderingContext2D, territories: readonly Territory[], river: River | undefined, width: number, height: number) {
  if (!river) return;
  const { scale } = fieldTransform(width, height);
  const top = screenPoint({ x: 0, y: river.top }, width, height).y;
  ctx.save();
  ctx.fillStyle = '#c4d8db';
  ctx.fillRect(0, top, width, (river.bottom - river.top) * scale);
  for (const deck of bridgeDecks(river, territories)) {
    const p = screenPoint(deck, width, height), w = deck.width * scale, h = deck.height * scale;
    ctx.fillStyle = '#f0f0e4'; ctx.strokeStyle = '#a9ae98'; ctx.lineWidth = scale;
    ctx.fillRect(p.x, p.y, w, h); ctx.strokeRect(p.x, p.y, w, h);
    ctx.strokeStyle = '#a4ac96'; ctx.lineWidth = 1.3 * scale;
    ctx.beginPath();
    for (const x of [p.x + 2 * scale, p.x + w - 2 * scale]) {
      ctx.moveTo(x, p.y + scale); ctx.lineTo(x, p.y + h - scale);
    }
    ctx.stroke();
  }
  ctx.restore();
}
