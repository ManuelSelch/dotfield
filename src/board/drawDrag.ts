import type { Territory } from '../game/types';
import type { DragSelection } from './drag';
import { projectBoard } from './layout';

export function drawDrag(ctx: CanvasRenderingContext2D, territories: readonly Territory[], selection: DragSelection | null, width: number, height: number) {
  if (!selection) return;
  const nodes = projectBoard(territories, width, height);
  const source = nodes.find((node) => node.id === selection.sourceId);
  if (!source) return;
  const target = nodes.find((node) => node.id === selection.targetId);
  ctx.save();
  ctx.strokeStyle = '#267c72';
  ctx.lineWidth = 2;
  ctx.setLineDash(target ? [] : [5, 5]);
  ctx.beginPath();
  ctx.moveTo(source.x, source.y);
  ctx.lineTo(target?.x ?? selection.point.x, target?.y ?? selection.point.y);
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  for (const node of [source, target]) {
    if (!node) continue;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#267c72';
  ctx.textAlign = 'center';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(`Send ${Math.floor(source.units / 2)}`, source.x, source.y - source.radius - 18);
  ctx.restore();
}
