import type { DragSelection } from '@/board/drag';
import { factionPalette } from '@/board/palette';
import { firstDefenderBlocker } from '@/game/defender-borders';
import { canRiverOrder, type River } from '@/game/river';
import { canDirectTerrainOrder } from '@/game/terrain/direct-order';
import type { Terrain } from '@/game/terrain/types';
import type { Territory } from '@/game/types';

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

function edgeKey(a: { x: number; y: number }, b: { x: number; y: number }) {
  const pointKey = (point: { x: number; y: number }) =>
    `${Math.round(point.x * 100)},${Math.round(point.y * 100)}`;
  return [pointKey(a), pointKey(b)].sort().join('|');
}

function drawConnectedPerimeter(
  ctx: CanvasRenderingContext2D,
  regions: readonly CityRegion[],
  connectedIds: ReadonlySet<string>,
) {
  const edges = new Map<
    string,
    { a: CityRegion['points'][number]; b: CityRegion['points'][number]; count: number }
  >();
  for (const region of regions) {
    if (!connectedIds.has(region.id) || region.points.length < 2) continue;
    for (let i = 0; i < region.points.length; i++) {
      const a = region.points[i],
        b = region.points[(i + 1) % region.points.length];
      const key = edgeKey(a, b),
        existing = edges.get(key);
      if (existing) existing.count++;
      else edges.set(key, { a, b, count: 1 });
    }
  }
  ctx.beginPath();
  for (const edge of edges.values())
    if (edge.count === 1) {
      ctx.moveTo(edge.a.x, edge.a.y);
      ctx.lineTo(edge.b.x, edge.b.y);
    }
  ctx.strokeStyle = '#267c72';
  ctx.lineWidth = 2.6;
  ctx.setLineDash([]);
  ctx.stroke();
}

export function drawRegions(
  ctx: CanvasRenderingContext2D,
  territories: readonly Territory[],
  regions: readonly CityRegion[],
  selection: DragSelection | null,
  river?: River,
  terrain?: Terrain,
  connectedIds: ReadonlySet<string> = new Set(),
  air = false,
) {
  const owners = new Map(territories.map((n) => [n.id, n.owner]));
  const source = territories.find((c) => c.id === selection?.sourceId);
  const target = territories.find((c) => c.id === selection?.targetId);
  const blockedId =
    !air &&
    source &&
    target &&
    source.id !== target.id &&
    (!canRiverOrder(source, target, river) ||
      !canDirectTerrainOrder(source, target, terrain) ||
      firstDefenderBlocker(territories, source, target, river))
      ? target.id
      : null;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = REGION_BORDER;
  ctx.lineWidth = 1.15;
  for (const region of regions) {
    const owner = owners.get(region.id);
    if (!owner) continue;
    const fill =
      REGION_FILLS[owner] ?? `color-mix(in srgb, ${factionPalette(owner).fill} 18%, white)`;
    ctx.fillStyle =
      region.id === blockedId
        ? '#f0dfd9'
        : region.id === selection?.sourceId
          ? REGION_SOURCE
          : region.id === selection?.targetId
            ? (REGION_TARGET[owner] ?? fill)
            : fill;
    path(ctx, region);
    ctx.fill();
    ctx.stroke();
  }
  if (connectedIds.size) drawConnectedPerimeter(ctx, regions, connectedIds);
  // Outline highlights last so adjacent region fills cannot obscure selection edges.
  ctx.strokeStyle = '#267c72';
  for (const region of regions) {
    const selected = region.id === selection?.sourceId || region.id === selection?.targetId;
    if (!selected && region.id !== selection?.focusId) continue;
    ctx.lineWidth = region.id === selection?.sourceId ? 2 : 2.4;
    ctx.strokeStyle = region.id === blockedId ? '#bd655f' : '#267c72';
    ctx.setLineDash(region.id === blockedId || !selected ? [5, 3] : []);
    path(ctx, region);
    ctx.stroke();
  }
  ctx.restore();
}
