import { beforeEach, describe, expect, it, vi } from 'vitest';

import { drawBoard } from './draw-board';

const layers = vi.hoisted(() => ({
  borders: vi.fn(),
  aircraft: vi.fn(),
  backgrounds: vi.fn(),
  transfers: vi.fn(),
  counters: vi.fn(),
  shields: vi.fn(),
  features: vi.fn(),
  regions: vi.fn(),
}));

vi.mock('./draw-territories', () => ({
  drawTerritoryBackgrounds: layers.backgrounds,
  drawTerritoryCounters: layers.counters,
}));
vi.mock('./draw-aircraft', () => ({ drawAircraft: layers.aircraft }));
vi.mock('./draw-defender-borders', () => ({ drawDefenderBorders: layers.borders }));
vi.mock('./draw-transfers', () => ({ drawTransfers: layers.transfers }));
vi.mock('./draw-capture-shields', () => ({ drawCaptureShields: layers.shields }));
vi.mock('./draw-city-features', () => ({ drawCityFeatures: layers.features }));
vi.mock('./draw-drag', () => ({ drawDrag: vi.fn() }));
vi.mock('./regions/cache', () => ({ createRegionCache: () => () => [] }));
vi.mock('./regions/draw-regions', () => ({ drawRegions: layers.regions }));
vi.mock('./draw-river', () => ({ drawRiver: vi.fn() }));
vi.mock('./draw-mountains', () => ({ drawMountains: vi.fn() }));
vi.mock('./draw-artillery', () => ({
  drawArtilleryCoverage: vi.fn(),
  drawArtilleryShots: vi.fn(),
}));

describe('board layer order', () => {
  beforeEach(() => vi.clearAllMocks());

  it('only highlights connected borders when Defensive Network is enabled', () => {
    const context = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const territories = [
      { id: 'home', owner: 'player', units: 10, x: 60, y: 100 },
      { id: 'neighbor', owner: 'player', units: 10, x: 180, y: 100 },
    ];
    const state = (connectedDefense: boolean) => ({
      territories,
      transfers: [],
      captureShields: {},
      homeCityIds: { player: 'home' },
      rules: { factions: { player: { connectedDefense } } },
    });

    drawBoard(canvas, state(false) as never, 320, 480, 1);
    expect(layers.regions.mock.lastCall?.[6]).toEqual(new Set());

    drawBoard(canvas, state(true) as never, 320, 480, 1);
    expect(layers.regions.mock.lastCall?.[6]).toEqual(new Set(['home', 'neighbor']));
  });

  it('updates shared shield capacity after a city conversion without an ownership change', () => {
    const context = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const rules = { factions: { player: { connectedDefense: false } } };
    const state = {
      territories: [{ id: 'home', owner: 'player', units: 10, x: 60, y: 100 }],
      transfers: [],
      captureShields: {},
      rules,
    };
    drawBoard(canvas, state as never, 320, 480, 1);
    expect(layers.features.mock.lastCall?.[5]?.get('home')).toBe(0);
    drawBoard(
      canvas,
      { ...state, territories: [{ ...state.territories[0], cityType: 'defender' }] } as never,
      320,
      480,
      1,
    );
    expect(layers.features.mock.lastCall?.[5]?.get('home')).toBe(3);
  });

  it('draws city circles behind troops and counters above them', () => {
    const context = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const state = {
      territories: [],
      transfers: [],
      captureShields: {},
      rules: { factions: { player: { connectedDefense: false } } },
    };

    drawBoard(canvas, state as never, 320, 480, 1);

    expect(layers.borders.mock.invocationCallOrder[0]).toBeLessThan(
      layers.backgrounds.mock.invocationCallOrder[0],
    );
    expect(layers.backgrounds.mock.invocationCallOrder[0]).toBeLessThan(
      layers.transfers.mock.invocationCallOrder[0],
    );
    expect(layers.transfers.mock.invocationCallOrder[0]).toBeLessThan(
      layers.counters.mock.invocationCallOrder[0],
    );
    expect(layers.aircraft.mock.invocationCallOrder[0]).toBeLessThan(
      layers.counters.mock.invocationCallOrder[0],
    );
  });
});
