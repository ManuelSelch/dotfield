import type { SimulationState } from '../game/types';
import { BASE_FACTION_RULES, getFactionRules } from '../game/rules';
import { projectBoard } from './layout';
import { PALETTE } from './palette';
import { drawChevronIcon, drawFactoryIcon } from './upgradeIcons';

export function drawCityFeatures(ctx: CanvasRenderingContext2D, state: SimulationState, width: number, height: number) {
  for (const city of projectBoard(state.territories, width, height)) {
    const radius = Math.max(7, city.radius * 0.34);
    const offset = Math.max(city.radius * 0.9, city.fontSize / 2 + radius + 2);
    function badge(side: -1 | 1, active: boolean, draw: (ctx: CanvasRenderingContext2D) => void) {
      const x = city.x + side * offset; const y = city.y - offset;
      ctx.save(); ctx.globalAlpha = active ? 1 : 0.45;
      ctx.fillStyle = PALETTE[city.owner].fill; ctx.strokeStyle = PALETTE[city.owner].ink;
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PALETTE[city.owner].ink;
      ctx.translate(x, y); ctx.scale(radius / 7, radius / 7); draw(ctx); ctx.restore();
    }
    for (const feature of city.features ?? []) {
      if (feature.kind === 'factory') badge(1, city.owner === feature.beneficiaryId, drawFactoryIcon);
    }
    // Faction-wide production boost only: Factory's local multiplier never adds a chevron.
    if (city.owner !== 'neutral' && getFactionRules(state, city.owner).unitsPerSecond > BASE_FACTION_RULES.unitsPerSecond) {
      badge(-1, true, drawChevronIcon);
    }
  }
}
