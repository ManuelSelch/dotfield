import { expect, it, vi } from 'vitest';

import { createSimulation } from '@/game/state';
import type { Aircraft, SimulationState } from '@/game/types';

import { aircraftGeometry, drawAircraft, hasAircraftAnimation } from './draw-aircraft';

const plane: Aircraft = {
  homeId: 'home',
  owner: 'player',
  phase: 'outbound',
  cargo: 95,
  tripId: 1,
  targetId: 'target',
  from: { x: 60, y: 100 },
  to: { x: 246, y: 100 },
  position: { x: 153, y: 100 },
  elapsedMs: 1000,
  durationMs: 2000,
};
const state = (aircraft = plane): SimulationState => ({
  ...createSimulation([
    { id: 'home', owner: 'player', cityType: 'airfield', units: 1, x: 60, y: 100 },
    { id: 'target', owner: 'enemy', units: 20, x: 260, y: 100 },
  ]),
  elapsedMs: 3000,
  aircraft: { home: aircraft },
});
const context = () => ({
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  roundRect: vi.fn(),
});

it('projects exact simulation positions and headings, never interpolates its own flight clock', () => {
  expect(aircraftGeometry(plane, 720, 960)).toMatchObject({ x: 306, y: 200, angle: 0 });
  const returning = {
    ...plane,
    phase: 'returning' as const,
    cargo: 0,
    from: plane.to,
    to: plane.from,
  };
  expect(aircraftGeometry(returning, 360, 480).angle).toBe(Math.PI);
});
it('keeps the dock fixed at the simulated city edge and shows cargo separately', () => {
  const docked = { ...plane, phase: 'unloading' as const, position: plane.to };
  const ctx = context();
  drawAircraft(ctx as never, state(docked), 360, 480);
  expect(ctx.translate).toHaveBeenCalledWith(246, 100);
  expect(ctx.fillText).toHaveBeenCalledWith('95', 246, 78);
  expect(ctx.arc).not.toHaveBeenCalled(); // No dot route or orbit.
});
it('draws empty returns and reduced motion preserves position and committed delivery feedback', () => {
  const s = {
    ...state({ ...plane, phase: 'returning' as const, cargo: 0 }),
    airDeliveries: [
      {
        homeId: 'home',
        tripId: 1,
        targetId: 'target',
        owner: 'player',
        units: 5,
        atMs: 2950,
        result: 'blocked' as const,
      },
    ],
  };
  const normal = context(),
    reduced = context();
  drawAircraft(normal as never, s, 360, 480);
  drawAircraft(reduced as never, s, 360, 480, true);
  expect(reduced.translate.mock.calls).toEqual(normal.translate.mock.calls);
  expect(reduced.fillText).toHaveBeenCalledWith('empty', 153, 78);
  expect(reduced.fillText).toHaveBeenCalledWith('blocked 5', 260, 132);
  expect(reduced.arc.mock.calls[0][2]).toBe(17);
  expect(normal.arc.mock.calls[0][2]).toBeGreaterThan(17);
  const expired = context();
  drawAircraft(expired as never, { ...s, elapsedMs: 4000 }, 360, 480);
  expect(expired.arc).not.toHaveBeenCalled();
});
it('labels availability without inventing flight dots or pulses from the unloading timer', () => {
  for (const [phase, expected] of [
    ['ready', 'ready'],
    ['preparing', 'prep 1s'],
    ['turnaround', 'turn 1s'],
  ] as const) {
    const ctx = context();
    drawAircraft(ctx as never, state({ ...plane, phase }), 360, 480);
    expect(ctx.fillText).toHaveBeenCalledWith(expected, 60, 133);
    expect(ctx.translate).not.toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  }
  const ctx = context();
  drawAircraft(ctx as never, state({ ...plane, phase: 'unloading' }), 360, 480);
  expect(ctx.arc).not.toHaveBeenCalled();
});
it('retains actual delivery feedback after home loss, and coalesces pulses at the same target', () => {
  const s = {
    ...state(),
    aircraft: {},
    airDeliveries: [
      {
        homeId: 'home',
        tripId: 1,
        targetId: 'target',
        owner: 'player',
        units: 5,
        atMs: 2800,
        result: 'defended' as const,
      },
      {
        homeId: 'home',
        tripId: 1,
        targetId: 'target',
        owner: 'player',
        units: 2,
        atMs: 3000,
        result: 'captured' as const,
      },
    ],
  };
  const ctx = context();
  drawAircraft(ctx as never, s, 360, 480, true);
  expect(ctx.arc).toHaveBeenCalledOnce();
  expect(ctx.fillText).toHaveBeenCalledWith('+2', 260, 132);
  expect(hasAircraftAnimation({ ...s, elapsedMs: 4000 })).toBe(false);
});
it('redraws flights, preparation and event expiry without ground transfers, not idle ready planes', () => {
  for (const phase of ['outbound', 'unloading', 'returning', 'preparing', 'turnaround'] as const)
    expect(hasAircraftAnimation(state({ ...plane, phase }))).toBe(true);
  expect(hasAircraftAnimation(state({ ...plane, phase: 'ready' }))).toBe(false);
  expect(
    hasAircraftAnimation({
      ...state({ ...plane, phase: 'ready' }),
      airDeliveries: [
        {
          homeId: 'home',
          tripId: 1,
          targetId: 'target',
          owner: 'player',
          units: 5,
          atMs: 3000,
          result: 'reinforced',
        },
      ],
    }),
  ).toBe(true);
});
