import type { SimulationState } from '../game/types';
import { screenPoint, fieldTransform } from './layout';

export function drawRelay(ctx: CanvasRenderingContext2D, state: SimulationState, width: number, height: number) {
  const city = state.relay && state.territories.find(c => c.id === state.relay!.cityId);
  if (!city) return;
  const point = screenPoint(city, width, height), { scale } = fieldTransform(width, height);
  ctx.save();
  ctx.strokeStyle = '#aa8131'; ctx.lineWidth = Math.max(1, 1.7 * scale);
  ctx.setLineDash([4 * scale, 3 * scale]);
  ctx.beginPath();ctx.arc(point.x, point.y, 22 * scale, 0, Math.PI * 2);ctx.stroke();
  ctx.setLineDash([]);ctx.fillStyle = '#94712f';ctx.font = `700 ${Math.max(8, 8 * scale)}px system-ui`;
  ctx.textAlign = 'center';ctx.textBaseline = 'alphabetic';
  ctx.fillText('RELAY', point.x, point.y - 29 * scale);
  ctx.restore();
}
