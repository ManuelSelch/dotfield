import { formationGeometry } from '@/game/dots';
import { DOT_RADIUS } from '@/game/settings';
import type { SimulationState } from '@/game/types';

import { fieldTransform, screenPoint } from './layout';
import { factionPalette } from './palette';

export function drawTransfers(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  width: number,
  height: number,
) {
  const { scale } = fieldTransform(width, height);
  ctx.save();
  for (const transfer of state.transfers) {
    if (transfer.elapsedMs < 0) continue;
    ctx.fillStyle = factionPalette(transfer.owner).fill;
    const geometry = formationGeometry(transfer);
    const midpoint = (transfer.formationSize - 1) / 2;
    for (const slot of transfer.dotSlots) {
      const offset = (slot - midpoint) * geometry.spacing;
      const point = screenPoint(
        {
          x: geometry.center.x + geometry.perpendicular.x * offset,
          y: geometry.center.y + geometry.perpendicular.y * offset,
        },
        width,
        height,
      );
      ctx.beginPath();
      ctx.arc(point.x, point.y, DOT_RADIUS * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
