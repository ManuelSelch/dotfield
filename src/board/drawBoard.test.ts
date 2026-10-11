import { beforeEach, describe, expect, it, vi } from 'vitest';
import { drawBoard } from './drawBoard';

const layers = vi.hoisted(() => ({
  backgrounds: vi.fn(), transfers: vi.fn(), counters: vi.fn(), shields: vi.fn(), features: vi.fn(),
}));

vi.mock('./drawTerritories', () => ({
  drawTerritoryBackgrounds: layers.backgrounds,
  drawTerritoryCounters: layers.counters,
}));
vi.mock('./drawTransfers', () => ({ drawTransfers: layers.transfers }));
vi.mock('./drawCaptureShields', () => ({ drawCaptureShields: layers.shields }));
vi.mock('./drawCityFeatures', () => ({ drawCityFeatures: layers.features }));
vi.mock('./drawDrag', () => ({ drawDrag: vi.fn() }));
vi.mock('./regions/cache', () => ({ createRegionCache: () => () => [] }));
vi.mock('./regions/drawRegions', () => ({ drawRegions: vi.fn() }));
vi.mock('./drawRiver', () => ({ drawRiver: vi.fn() }));
vi.mock('./drawMountains', () => ({ drawMountains: vi.fn() }));
vi.mock('./drawArtillery', () => ({ drawArtilleryCoverage: vi.fn(), drawArtilleryShots: vi.fn() }));

describe('board layer order', () => {
  beforeEach(() => vi.clearAllMocks());

  it('draws city circles behind troops and counters above them', () => {
    const context = { setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn() };
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    const state = { territories: [], transfers: [], captureShields: {}, rules: { factions: { player: { connectedDefense: false } } } };

    drawBoard(canvas, state as never, 320, 480, 1);

    expect(layers.backgrounds.mock.invocationCallOrder[0]).toBeLessThan(layers.transfers.mock.invocationCallOrder[0]);
    expect(layers.transfers.mock.invocationCallOrder[0]).toBeLessThan(layers.counters.mock.invocationCallOrder[0]);
  });
});
