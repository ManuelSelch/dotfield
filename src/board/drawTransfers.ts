import type { SimulationState } from '../game/types';
import { dotPosition } from '../game/dots';
import { DOT_RADIUS } from '../game/settings';
import { fieldTransform, screenPoint } from './layout';
import { PALETTE } from './palette';

export function drawTransfers(ctx: CanvasRenderingContext2D, state: SimulationState, width: number, height: number) {
  const { scale } = fieldTransform(width, height);
  ctx.save();
  for (const transfer of state.transfers) {
    if (transfer.elapsedMs < 0) continue;
    ctx.fillStyle = PALETTE[transfer.owner].fill;
    for (const slot of transfer.dotSlots) {
      const point = screenPoint(dotPosition(transfer, slot), width, height);
      ctx.beginPath();
      ctx.arc(point.x, point.y, DOT_RADIUS * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
