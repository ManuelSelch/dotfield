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
    ctx.fillStyle = '#ddd8bf'; ctx.strokeStyle = '#87988a'; ctx.lineWidth = scale;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(p.x, p.y, w, h, 3 * scale);
    else ctx.rect(p.x, p.y, w, h);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#9aa38d'; ctx.lineWidth = scale;
    ctx.beginPath();
    for (const x of [p.x + w / 2 - 12 * scale, p.x + w / 2 + 12 * scale]) {
      ctx.moveTo(x, p.y + scale); ctx.lineTo(x, p.y + h - scale);
    }
    ctx.stroke();
  }
  ctx.restore();
}
