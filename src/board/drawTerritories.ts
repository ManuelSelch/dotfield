import type { SimulationState } from '../game/types';
import { projectBoard } from './layout';
import { factionPalette } from './palette';

export function drawTerritoryBackgrounds(ctx: CanvasRenderingContext2D, state: SimulationState, width: number, height: number) {
  for (const node of projectBoard(state.territories, width, height)) {
    const palette = factionPalette(node.owner);
    if (node.owner !== 'neutral' && !state.captureShields[node.id]?.remaining) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = palette.stroke;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = palette.fill;
    ctx.fill();
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function drawTerritoryCounters(ctx: CanvasRenderingContext2D, state: SimulationState, width: number, height: number) {
  for (const node of projectBoard(state.territories, width, height)) {
    const palette = factionPalette(node.owner);
    ctx.fillStyle = palette.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${node.fontSize}px system-ui, sans-serif`;
    ctx.fillText(String(node.units), node.x, node.y - 2);
    const markerY = node.y + node.radius * 0.56;
    if (node.owner === 'enemy') ctx.fillRect(node.x - 2, markerY - 2, 4, 4);
    else if (node.owner === 'player') {
      ctx.beginPath();
      ctx.arc(node.x, markerY, 2.3, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.fillRect(node.x - 3, markerY - 0.7, 6, 1.4);
  }
}
