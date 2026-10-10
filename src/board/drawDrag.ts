import type { Territory } from '../game/types';
import type { DragSelection } from './drag';
import { projectBoard, screenPoint } from './layout';
import { createRoute } from '../game/route';
import { canRiverOrder, pairedCityId, type River } from '../game/river';

export function drawDrag(ctx: CanvasRenderingContext2D, territories: readonly Territory[], selection: DragSelection | null, width: number, height: number, river?: River) {
  if (!selection) return;
  const nodes = projectBoard(territories, width, height);
  const source = nodes.find((node) => node.id === selection.sourceId);
  if (!source) return;
  const target = nodes.find((node) => node.id === selection.targetId);
  const invalid = target && !canRiverOrder(source, target, river);
  const logicalSource = territories.find(node => node.id === selection.sourceId)!;
  const logicalTarget = territories.find(node => node.id === selection.targetId);
  const route = river && logicalTarget ? createRoute(logicalSource, logicalTarget) : null;
  const from = route ? screenPoint(route.from, width, height) : source;
  const to = route ? screenPoint(route.to, width, height) : target ?? selection.point;
  ctx.save();
  const paired = nodes.find(node => node.id === pairedCityId(source.id, river));
  if (paired) {
    ctx.strokeStyle = '#267c72'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(paired.x, paired.y, paired.radius + 6, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = invalid ? '#bd655f' : '#267c72';
  ctx.lineWidth = 2;
  ctx.setLineDash(target && !invalid ? [] : [5, 5]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  for (const node of [source, target]) {
    if (!node) continue;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
