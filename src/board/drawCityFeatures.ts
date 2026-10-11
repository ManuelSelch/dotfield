import type { SimulationState } from '../game/types';
import { BASE_FACTION_RULES, getFactionRules } from '../game/rules';
import { projectBoard } from './layout';
import { factionPalette } from './palette';
import { drawChevronIcon, drawFactoryIcon, drawWatchtowerIcon, drawSlowZoneIcon, drawArtilleryIcon, drawDefenseShieldsIcon } from './upgradeIcons';
import { connectedTerritoryIds } from '../game/connectedTerritories';
import { connectedDefenseTierForSize } from '../game/connectedDefense';
import { TERRITORY_RADIUS } from '../game/settings';

export function drawCityFeatures(ctx: CanvasRenderingContext2D, state: SimulationState, width: number, height: number,
  connectedNetworks?: ReadonlyMap<string, ReadonlySet<string>>) {
  const networks = connectedNetworks ?? new Map(Object.entries(state.rules.factions).flatMap(([factionId, rules]) => {
    if (!rules.connectedDefense) return [];
    return [[factionId, connectedTerritoryIds(state.territories, factionId, state.homeCityIds?.[factionId], state.river, state.terrain)] as const];
  }));
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
      if (feature.kind === 'artillery') badge(city.features?.some(f => f.kind === 'factory') ? 0 : 1,
        city.owner !== 'neutral', drawArtilleryIcon);
      if (feature.kind === 'slow-zone') {
        const range = feature.radius * city.radius / TERRITORY_RADIUS;
        ctx.save(); ctx.globalAlpha = 0.09;
        ctx.fillStyle = factionPalette(city.owner).fill;
        ctx.beginPath(); ctx.arc(city.x, city.y, range, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.45; ctx.strokeStyle = factionPalette(city.owner).ink;
        ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.restore();
        badge(-1, true, drawSlowZoneIcon, 1);
      }
      if (feature.kind === 'watchtower') {
        const range = feature.range * city.radius / TERRITORY_RADIUS;
        ctx.save(); ctx.globalAlpha = city.owner === 'neutral' ? 0.12 : 0.2;
        ctx.fillStyle = factionPalette(city.owner).fill; ctx.strokeStyle = factionPalette(city.owner).fill;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(city.x, city.y, range, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
        // Keep the tower visually distinct when Factory is also installed on this city.
        badge(1, city.owner !== 'neutral', drawWatchtowerIcon, 1);
      }
    }
    // Faction-wide production boost only: Factory's local multiplier never adds a chevron.
    if (city.owner !== 'neutral' && getFactionRules(state, city.owner).unitsPerSecond > BASE_FACTION_RULES.unitsPerSecond) {
      badge(-1, true, drawChevronIcon);
    }
    const connectedIds = city.owner !== 'neutral' && getFactionRules(state, city.owner).connectedDefense
      ? networks.get(city.owner) : undefined;
    const defenseTier = connectedIds ? connectedDefenseTierForSize(connectedIds.size) : 0;
    if (defenseTier > 0 && connectedIds?.has(city.id)) {
      const badgeWidth = 3 + defenseTier * 4.2, badgeHeight = 8;
      const x = Math.max(1, Math.min(width - badgeWidth - 1, city.x - badgeWidth / 2));
      const y = Math.max(1, Math.min(height - badgeHeight - 1, city.y + city.radius * 0.48));
      const palette = factionPalette(city.owner);
      ctx.save(); ctx.fillStyle = palette.fill; ctx.strokeStyle = palette.ink; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x, y, badgeWidth, badgeHeight, badgeHeight / 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.translate(x + badgeWidth / 2, y + badgeHeight / 2 + 1);
      ctx.scale(0.8, 0.8); drawDefenseShieldsIcon(ctx, defenseTier as 1 | 2 | 3); ctx.restore();
    }
  }
}
