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
    // A compact row across the flight direction; every dot has the same arrival time.
    for (let index = 0; index < transfer.units; index++) {
      const offset = (index - (transfer.units - 1) / 2) * 6;
      ctx.beginPath();
      ctx.arc(point.x - dy / length * offset, point.y + dx / length * offset, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
