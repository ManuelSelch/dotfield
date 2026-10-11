import type { SimulationState } from '../game/types';
import type { DragSelection } from './drag';
import { drawTerritoryBackgrounds, drawTerritoryCounters } from './drawTerritories';
import { drawCaptureShields } from './drawCaptureShields';
import { drawCityFeatures } from './drawCityFeatures';
import { drawDrag } from './drawDrag';
import { drawTransfers } from './drawTransfers';
import { createRegionCache } from './regions/cache';
import { drawRegions } from './regions/drawRegions';
import { drawRiver } from './drawRiver';
import { drawMountains } from './drawMountains';
import { drawArtilleryCoverage, drawArtilleryShots } from './drawArtillery';
import { connectedTerritoryIds } from '../game/connectedTerritories';

const regionCaches = new WeakMap<HTMLCanvasElement, ReturnType<typeof createRegionCache>>();
const connectivityCaches = new WeakMap<HTMLCanvasElement, {
  key: string; river: SimulationState['river']; terrain: SimulationState['terrain']; rules: SimulationState['rules'];
  ids: ReadonlySet<string>; networks: ReadonlyMap<string, ReadonlySet<string>>;
}>();
const MAX_BUSY_PIXEL_RATIO = 2;
const BUSY_TRANSFER_THRESHOLD = 12;

function renderPixelRatio(pixelRatio: number, transferCount: number) {
  return transferCount > BUSY_TRANSFER_THRESHOLD ? Math.min(pixelRatio, MAX_BUSY_PIXEL_RATIO) : pixelRatio;
}

export function drawBoard(
  canvas: HTMLCanvasElement, state: SimulationState,
  width: number, height: number, pixelRatio: number, selection: DragSelection | null = null,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || width <= 0 || height <= 0) return;
  // High-DPI phones multiply every filled pixel. Preserve sharpness normally, but
  // lower the backing resolution during large battles to keep the RAF responsive.
  const renderRatio = renderPixelRatio(pixelRatio, state.transfers.length);
  const backingWidth = Math.round(width * renderRatio);
  const backingHeight = Math.round(height * renderRatio);
  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;
  ctx.setTransform(renderRatio, 0, 0, renderRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  let getRegions = regionCaches.get(canvas);
  if (!getRegions) { getRegions = createRegionCache(); regionCaches.set(canvas, getRegions); }
  const homeCityId = state.homeCityIds?.player;
  const homesKey = Object.entries(state.homeCityIds ?? {}).map(([id, home]) => `${id}:${home}`).join('|');
  const ownershipKey = `${homesKey}|${state.territories.map(city => `${city.id}:${city.owner}`).join('|')}`;
  let connectivity = connectivityCaches.get(canvas);
  if (!connectivity || connectivity.key !== ownershipKey || connectivity.river !== state.river
    || connectivity.terrain !== state.terrain || connectivity.rules !== state.rules) {
    const networks = new Map<string, ReadonlySet<string>>();
    for (const factionId of Object.keys(state.rules.factions)) {
      if (factionId === 'player' || state.rules.factions[factionId].connectedDefense) {
        networks.set(factionId, connectedTerritoryIds(state.territories, factionId,
          state.homeCityIds?.[factionId], state.river, state.terrain));
      }
    }
    connectivity = { key: ownershipKey, river: state.river, terrain: state.terrain, rules: state.rules,
      ids: networks.get('player') ?? new Set(), networks };
    connectivityCaches.set(canvas, connectivity);
  }
  drawRegions(ctx, state.territories, getRegions(state.territories, width, height, state.river), selection,
    state.river, state.terrain, connectivity.ids);
  ctx.fillStyle = '#c4cec2';
  ctx.globalAlpha = 0.5;
  for (let x = 12; x < width; x += 24) {
    for (let y = 12; y < height; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  drawRiver(ctx, state.territories, state.river, width, height);
  drawMountains(ctx, state.terrain, width, height);
  drawArtilleryCoverage(ctx, state, width, height);
  drawTerritoryBackgrounds(ctx, state, width, height);
  drawTransfers(ctx, state, width, height);
  drawTerritoryCounters(ctx, state, width, height);
  drawCaptureShields(ctx, state, width, height,
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  drawCityFeatures(ctx, state, width, height, connectivity.networks);
  drawArtilleryShots(ctx, state, width, height, typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  drawDrag(ctx, state.territories, selection, width, height, state.river, state.terrain);
}
