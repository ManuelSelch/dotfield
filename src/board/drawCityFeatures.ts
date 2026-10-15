import type { SimulationState } from '../game/types';
import { BASE_FACTION_RULES, getFactionRules } from '../game/rules';
import { projectBoard } from './layout';
import { factionPalette } from './palette';
import { drawChevronIcon, drawFactoryIcon, drawWatchtowerIcon, drawSlowZoneIcon, drawArtilleryIcon, drawDefenseShieldIcon } from './upgradeIcons';
import { shieldRechargeSource } from '../game/features/networkShields';
import { drawAirplaneIcon } from './drawAircraft';
import { TERRITORY_RADIUS, WATCHTOWER_RANGE } from '../game/settings';

export function drawCityFeatures(ctx: CanvasRenderingContext2D, state: SimulationState, width: number, height: number,
  _connectedNetworks?: ReadonlyMap<string, ReadonlySet<string>>, shieldCapacities?: ReadonlyMap<string, number>) {
  for (const city of projectBoard(state.territories, width, height)) {
    const radius = Math.max(5, city.radius * 0.34);
    const offset = Math.max(city.radius * 0.9, city.fontSize / 2 + radius + 2);
    function badge(side: -1 | 0 | 1, active: boolean, draw: (ctx: CanvasRenderingContext2D) => void, vertical: -1 | 1 = -1) {
      const x = Math.max(radius + 1, Math.min(width - radius - 1, city.x + side * offset));
      const y = Math.max(radius + 1, Math.min(height - radius - 1, city.y + vertical * offset));
      ctx.save(); ctx.globalAlpha = active ? 1 : 0.45;
      ctx.fillStyle = factionPalette(city.owner).fill; ctx.strokeStyle = factionPalette(city.owner).ink;
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = factionPalette(city.owner).ink;
      ctx.translate(x, y); ctx.scale(radius / 7, radius / 7); draw(ctx); ctx.restore();
    }
    for (const feature of city.features ?? []) {
      if (feature.kind === 'factory') badge(1, city.owner !== 'neutral', drawFactoryIcon);
      if (feature.kind === 'slow-zone') {
        const range = feature.radius * city.radius / TERRITORY_RADIUS;
        ctx.save(); ctx.globalAlpha = 0.09;
        ctx.fillStyle = factionPalette(city.owner).fill;
        ctx.beginPath(); ctx.arc(city.x, city.y, range, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.45; ctx.strokeStyle = factionPalette(city.owner).ink;
        ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.restore();
        badge(-1, true, drawSlowZoneIcon, 1);
      }
    }
    if (city.cityType === 'watchtower') {
      const range = WATCHTOWER_RANGE * city.radius / TERRITORY_RADIUS;
      ctx.save(); ctx.globalAlpha = city.owner === 'neutral' ? 0.12 : 0.2;
      ctx.fillStyle = factionPalette(city.owner).fill; ctx.strokeStyle = factionPalette(city.owner).fill;
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(city.x, city.y, range, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
      badge(1, city.owner !== 'neutral', drawWatchtowerIcon, 1);
    }
    if (city.cityType === 'artillery') badge(city.features?.some(f => f.kind === 'factory') ? 0 : 1,
      city.owner !== 'neutral', drawArtilleryIcon);
    // Faction-wide production boost only: Factory's local multiplier never adds a chevron.
    if ((!city.cityType || city.cityType === 'production') && city.owner !== 'neutral'
      && getFactionRules(state, city.owner).unitsPerSecond > BASE_FACTION_RULES.unitsPerSecond) {
      badge(-1, true, drawChevronIcon);
    }
    if (city.cityType === 'airfield') badge(-1, city.owner !== 'neutral', ctx => {
      // Runway stays in the badge; neither this marker nor the plane changes hit geometry.
      ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(4, 4); ctx.stroke();
      ctx.scale(0.45, 0.45); drawAirplaneIcon(ctx);
    });
    const defenseTier = shieldCapacities?.get(city.id) ?? shieldRechargeSource(state, city.id).capacity;
    if (defenseTier > 0 || city.cityType === 'defender') {
      const iconSize = Math.max(12, Math.min(18, city.radius * 0.9));
      // Defender owns the upper-left type slot; network-only shields stay below the city.
      // Both use the same one numbered capacity badge, never two additive shield markers.
      const defender = city.cityType === 'defender';
      const centerX = Math.max(iconSize / 2 + 1, Math.min(width - iconSize / 2 - 1, city.x - (defender ? offset : 0)));
      const centerY = Math.max(iconSize / 2 + 1, Math.min(height - iconSize / 2 - 1,
        city.y + (defender ? -offset : city.radius + 8)));
      const palette = factionPalette(city.owner);
      ctx.save(); ctx.fillStyle = palette.fill; ctx.strokeStyle = palette.ink;
      ctx.translate(centerX - iconSize / 2, centerY - iconSize / 2); ctx.scale(iconSize / 24, iconSize / 24);
      ctx.globalAlpha = city.owner === 'neutral' ? 0.45 : 1;
      drawDefenseShieldIcon(ctx, defenseTier as 0 | 1 | 2 | 3, palette.ink); ctx.restore();
    }
  }
}
