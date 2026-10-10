import type { Territory } from '../../game/types';
import type { DragSelection } from '../drag';
import type { CityRegion } from './geometry';
import { REGION_BORDER, REGION_FILLS, REGION_SOURCE, REGION_TARGET } from './styles';
import { factionPalette } from '../palette';
import { canRiverOrder, type River } from '../../game/river';

function path(ctx: CanvasRenderingContext2D, region: CityRegion) {
  ctx.beginPath();
  region.points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
}

export function drawRegions(ctx: CanvasRenderingContext2D, territories: readonly Territory[],
  regions: readonly CityRegion[], selection: DragSelection | null, river?: River) {
  const owners = new Map(territories.map(n => [n.id, n.owner]));
  const source = territories.find(c => c.id === selection?.sourceId);
  const target = territories.find(c => c.id === selection?.targetId);
  const blockedId = source && target && !canRiverOrder(source, target, river) ? target.id : null;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = REGION_BORDER;
  ctx.lineWidth = 1.15;
  for (const region of regions) {
    const owner = owners.get(region.id);
    if (!owner) continue;
    const fill = REGION_FILLS[owner] ?? `color-mix(in srgb, ${factionPalette(owner).fill} 18%, white)`;
    ctx.fillStyle = region.id === blockedId ? '#f0dfd9' : region.id === selection?.sourceId ? REGION_SOURCE
      : region.id === selection?.targetId ? (REGION_TARGET[owner] ?? fill) : fill;
    path(ctx, region); ctx.fill(); ctx.stroke();
  }
  // Outline highlights last so adjacent region fills cannot obscure selection edges.
  ctx.strokeStyle = '#267c72';
  for (const region of regions) {
    const selected = region.id === selection?.sourceId || region.id === selection?.targetId;
    if (!selected && region.id !== selection?.focusId) continue;
    ctx.lineWidth = region.id === selection?.sourceId ? 2 : 2.4;
    ctx.strokeStyle = region.id === blockedId ? '#bd655f' : '#267c72';
    ctx.setLineDash(region.id === blockedId || !selected ? [5, 3] : []);
    path(ctx, region); ctx.stroke();
  }
  ctx.restore();
}
