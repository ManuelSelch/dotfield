import { artilleryTarget, ARTILLERY_FEEDBACK_MS } from '@/game/features/artillery';
import { ARTILLERY_RANGE, TERRITORY_RADIUS } from '@/game/settings';
import type { SimulationState } from '@/game/types';

import { projectBoard } from './layout';
import { factionPalette } from './palette';

export function drawArtilleryCoverage(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  width: number,
  height: number,
) {
  const cities = projectBoard(state.territories, width, height);
  for (const city of cities) {
    if (city.cityType !== 'artillery') continue;
    ctx.save();
    ctx.fillStyle = factionPalette(city.owner).fill;
    ctx.strokeStyle = factionPalette(city.owner).fill;
    ctx.globalAlpha = 0.035;
    ctx.beginPath();
    ctx.arc(city.x, city.y, (ARTILLERY_RANGE * city.radius) / TERRITORY_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = city.owner === 'neutral' ? 0.25 : 0.4;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.stroke();
    const target = artilleryTarget(
      state,
      state.territories.find((c) => c.id === city.id)!,
    );
    const projected = target && cities.find((c) => c.id === target.id);
    if (projected) {
      ctx.strokeStyle = factionPalette(projected.owner).fill;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(
        projected.x,
        projected.y,
        projected.radius + (5 * city.radius) / TERRITORY_RADIUS,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawArtilleryShots(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  width: number,
  height: number,
  reducedMotion = false,
) {
  const cities = projectBoard(state.territories, width, height);
  for (const shot of state.artilleryShots ?? []) {
    if (state.elapsedMs - shot.firedAtMs >= ARTILLERY_FEEDBACK_MS) continue;
    const a = cities.find((c) => c.id === shot.sourceId),
      b = cities.find((c) => c.id === shot.targetId);
    if (!a || !b) continue;
    const distance = Math.hypot(b.x - a.x, b.y - a.y),
      dx = (b.x - a.x) / distance,
      dy = (b.y - a.y) / distance;
    if (!distance) continue;
    const scale = a.radius / TERRITORY_RADIUS;
    ctx.save();
    ctx.strokeStyle = factionPalette(shot.owner).fill;
    ctx.lineWidth = 1.6;
    if (!reducedMotion) {
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(a.x + dx * a.radius, a.y + dy * a.radius);
      ctx.lineTo(b.x - dx * b.radius, b.y - dy * b.radius);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#bd624e';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 4 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#bd624e';
    ctx.font = `600 ${Math.max(11, 12 * scale)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('−1', b.x, b.y - 25 * scale);
    ctx.restore();
  }
}
