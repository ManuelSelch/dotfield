import type { SimulationState } from '../game/types';
import { transferPosition } from '../game/travel';
import { screenPoint } from './layout';
import { PALETTE } from './palette';

export function drawTransfers(ctx: CanvasRenderingContext2D, state: SimulationState, width: number, height: number) {
  ctx.save();
  for (const transfer of state.transfers) {
    if (transfer.elapsedMs < 0) continue;
    const point = screenPoint(transferPosition(transfer), width, height);
    const dx = transfer.to.x - transfer.from.x;
    const dy = transfer.to.y - transfer.from.y;
    const length = Math.hypot(dx, dy) || 1;
    ctx.fillStyle = PALETTE[transfer.owner].fill;
    // Spread over the first 30%, then gather during the final 20%.
    const progress = transfer.elapsedMs / transfer.durationMs;
    const opening = Math.max(0, Math.min(1, progress / 0.3));
    const gathering = Math.max(0, Math.min(1, (progress - 0.8) / 0.2));
    const spread = opening * opening * (3 - 2 * opening)
      * (1 - gathering * gathering * (3 - 2 * gathering));
    for (let index = 0; index < transfer.units; index++) {
      const offset = (index - (transfer.units - 1) / 2) * 18 * spread;
      ctx.beginPath();
      ctx.arc(point.x - dy / length * offset, point.y + dx / length * offset, 7.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
