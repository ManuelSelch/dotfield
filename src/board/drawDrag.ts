import type { Territory } from '../game/types';
import { firstDefenderBlocker, segmentRegionEntry } from '../game/defenderBorders';
import { logicalTerritoryRegions } from '../game/territoryRegions';
import type { Terrain } from '../game/terrain/types';
import { canDirectTerrainOrder } from '../game/terrain/directOrder';
import type { DragSelection } from './drag';
import { projectBoard, screenPoint } from './layout';
import { createRoute } from '../game/route';
import { canRiverOrder, pairedCityId, type River } from '../game/river';

export function drawDrag(ctx: CanvasRenderingContext2D, territories: readonly Territory[], selection: DragSelection | null, width: number, height: number, river?: River, terrain?: Terrain, air = false) {
  if (!selection) return;
  const nodes = projectBoard(territories, width, height);
  const source = nodes.find((node) => node.id === selection.sourceId);
  if (!source) return;
  const target = nodes.find((node) => node.id === selection.targetId);
  const logicalSource = territories.find(node => node.id === selection.sourceId)!;
  const logicalTarget = territories.find(node => node.id === selection.targetId);
  const blocker = !air && logicalTarget ? firstDefenderBlocker(territories, logicalSource, logicalTarget, river) : undefined;
  const invalid = !air && logicalTarget && (!canRiverOrder(logicalSource, logicalTarget, river)
    || !canDirectTerrainOrder(logicalSource, logicalTarget, terrain) || blocker);
  const route = (river || terrain || blocker || air) && logicalTarget ? createRoute(logicalSource, logicalTarget) : null;
  const from = air ? source : route ? screenPoint(route.from, width, height) : source;
  const to = route ? screenPoint(route.to, width, height) : target ?? selection.point;
  ctx.save();
  const paired = nodes.find(node => node.id === pairedCityId(source.id, river));
  if (paired && !air) {
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
  if (blocker && route) {
    const region = logicalTerritoryRegions(territories, river).find(r => r.id === blocker.id)!;
    const entry = segmentRegionEntry(route.from, route.to, region.points) ?? 0.5;
    const p = screenPoint({ x: route.from.x + (route.to.x - route.from.x) * entry,
      y: route.from.y + (route.to.y - route.from.y) * entry }, width, height);
    ctx.beginPath(); ctx.moveTo(p.x - 4, p.y - 4); ctx.lineTo(p.x + 4, p.y + 4);
    ctx.moveTo(p.x + 4, p.y - 4); ctx.lineTo(p.x - 4, p.y + 4); ctx.stroke();
  }
  for (const node of [source, target]) {
    if (!node) continue;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
