import type { Territory } from '../../game/types';
import type { DragSelection } from '../drag';
import type { CityRegion } from './geometry';
import { REGION_BORDER, REGION_FILLS, REGION_SOURCE, REGION_TARGET } from './styles';

function path(ctx: CanvasRenderingContext2D, region: CityRegion) {
  ctx.beginPath();
  region.points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
}

export function drawRegions(ctx: CanvasRenderingContext2D, territories: readonly Territory[],
  regions: readonly CityRegion[], selection: DragSelection | null) {
  const owners = new Map(territories.map(n => [n.id, n.owner]));
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = REGION_BORDER;
  ctx.lineWidth = 1.15;
  for (const region of regions) {
    const owner = owners.get(region.id);
    if (!owner) continue;
    ctx.fillStyle = region.id === selection?.sourceId ? REGION_SOURCE
      : region.id === selection?.targetId ? REGION_TARGET[owner] : REGION_FILLS[owner];
    path(ctx, region); ctx.fill(); ctx.stroke();
  }
  // Outline highlights last so adjacent region fills cannot obscure selection edges.
  ctx.strokeStyle = '#267c72';
  for (const region of regions) {
    const selected = region.id === selection?.sourceId || region.id === selection?.targetId;
    if (!selected && region.id !== selection?.focusId) continue;
    ctx.lineWidth = region.id === selection?.sourceId ? 2 : 2.4;
    ctx.setLineDash(selected ? [] : [5, 3]);
    path(ctx, region); ctx.stroke();
  }
  ctx.restore();
}
