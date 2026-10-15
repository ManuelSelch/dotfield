import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { advanceWorldStep } from './worldStep';
import { launchAircraft } from './aircraft';
import { dispatchUnits } from './dispatch';
import type { SimulationState, Transfer } from './types';

const gun = { id: 'gun', kind: 'artillery' as const, range: 150, fireIntervalMs: 2000 };
const rules = { factions: {
  player: { unitsPerSecond: 0, travelSpeed: 35, batchIntervalMs: 600 },
  enemy: { unitsPerSecond: 0, travelSpeed: 35, batchIntervalMs: 600 },
} };
const city = (state: SimulationState, id: string) => state.territories.find(c => c.id === id)!;

describe('artillery physical event ordering', () => {
  it('fires a captured gun at its fractional deadline before the following ground capture', () => {
    const base = createSimulation([
      { id: 'h', owner: 'player', cityType: 'airfield', units: 101, x: 0, y: 0 },
      { id: 't', owner: 'enemy', units: 1, x: 97, y: 0, features: [gun] },
      { id: 'v', owner: 'enemy', units: 2, x: 97, y: 100 },
      { id: 's', owner: 'player', units: 2, x: 97, y: 316.545 },
    ], rules);
    const state = dispatchUnits(launchAircraft({ ...base, aircraft: {
      h: { ...base.aircraft!.h, phase: 'ready', elapsedMs: 0 },
    }, artilleryTimers: { gun: { owner: 'enemy', elapsedMs: 0 } } }, 'h', 't'), 's', 'v');
    const coarse = advanceWorldStep(state, 5400);
    const split = advanceWorldStep(advanceWorldStep(state, 5386), 14);
    expect(city(coarse, 'v')).toMatchObject({ owner: 'player', units: 1 });
    expect(city(split, 'v')).toEqual(city(coarse, 'v'));
    expect(coarse.artilleryShots?.[0].firedAtMs).toBeCloseTo(5385.714285714286);
    expect(split.artilleryShots).toEqual(coarse.artilleryShots);
  });

  it('also resolves off-grid watchtower deadlines before later ground arrivals', () => {
    const base = createSimulation([
      { id: 's', owner: 'player', cityType: 'defender', units: 2, x: 0, y: 100 },
      { id: 'g', owner: 'enemy', units: 1, x: 100, y: 100,
        features: [{ id: 'tower', kind: 'watchtower', range: 150, fireIntervalMs: 37 }] },
    ], rules);
    const state = { ...base, transfers: [{ id: 1, sourceId: 's', targetId: 'g', owner: 'player',
      units: 1, formationSize: 1, dotSlots: [0], from: { x: 14, y: 100 }, to: { x: 86, y: 100 },
      durationMs: 40, elapsedMs: 0 }] };
    const coarse = advanceWorldStep(state, 40);
    const split = advanceWorldStep(advanceWorldStep(state, 37), 3);
    expect(city(coarse, 'g').units).toBe(1);
    expect(split).toEqual(coarse);
  });

  it('resets the full cooldown on each same-timestamp capture and recapture', () => {
    const base = createSimulation([
      { id: 'g', owner: 'player', cityType: 'defender', units: 1, x: 0, y: 0, features: [gun] },
      { id: 'e', owner: 'enemy', units: 10, x: 100, y: 0 },
    ], rules);
    const almost = advanceWorldStep(base, 1990);
    const batch = (owner: string, id: number): Transfer => ({
      id, sourceId: 'e', targetId: 'g', owner, units: 2, formationSize: 2, dotSlots: [0, 1],
      from: { x: owner === 'enemy' ? 100 : -100, y: 0 },
      to: { x: owner === 'enemy' ? 14 : -14, y: 0 }, durationMs: 10, elapsedMs: 0,
    });
    const captured = advanceWorldStep({ ...almost, transfers: [batch('enemy', 1), batch('player', 2)] }, 10);
    expect(city(captured, 'g')).toMatchObject({ owner: 'player', units: 1 });
    expect(city(captured, 'e').units).toBe(10);
    expect(captured.artilleryTimers?.gun).toEqual({ owner: 'player', elapsedMs: 0 });
    expect(city(advanceWorldStep(captured, 1999), 'e').units).toBe(10);
    expect(city(advanceWorldStep(captured, 2000), 'e').units).toBe(9);
  });
});
