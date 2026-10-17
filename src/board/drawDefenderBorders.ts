import { logicalTerritoryRegions } from '../game/territoryRegions';
import type { River } from '../game/river';
import type { Territory } from '../game/types';
import { screenPoint } from './layout';
import { factionPalette } from './palette';

/** Fortified full-region edges, deliberately distinct from network and Relay.
 * Geometry is simulation-owned; only its projection depends on the viewport. */
export function drawDefenderBorders(ctx: CanvasRenderingContext2D, cities: readonly Territory[],
  width: number, height: number, river?: River) {
  const defenders = cities.filter(c => c.cityType === 'defender' && c.owner !== 'neutral');
  if (!defenders.length) return;
  const regions = logicalTerritoryRegions(cities, river);
  ctx.save();
  ctx.lineJoin = 'round';
  for (const city of defenders) {
    const region = regions.find(r => r.id === city.id)!;
    ctx.beginPath();
    region.points.forEach((p, i) => {
      const projected = screenPoint(p, width, height);
      if (i === 0) ctx.moveTo(projected.x, projected.y); else ctx.lineTo(projected.x, projected.y);
    });
    ctx.closePath();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = factionPalette(city.owner).stroke;
    ctx.lineWidth = 4;
    ctx.setLineDash([]); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fcfcf8'; ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 7]); ctx.stroke();
  }
  ctx.restore();
}
