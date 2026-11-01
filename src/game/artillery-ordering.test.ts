import { describe, expect, it } from 'vitest';

import { resolveCombat } from './combat';
import { dispatchUnits } from './dispatch';
import { ARTILLERY_FIRE_INTERVAL_MS, WATCHTOWER_FIRE_INTERVAL_MS } from './settings';
import { createSimulation } from './state';
import type { SimulationState, Transfer } from './types';
import { advanceWorldStep } from './world-step';

const rules = { unitsPerSecond: 0 };
const city = (state: SimulationState, id: string) => state.territories.find((c) => c.id === id)!;

describe('weapon role physical event ordering', () => {
  it('fires Artillery on its fractional deadline before a later ground capture', () => {
    const base = createSimulation(
      [
        { id: 'gun', owner: 'player', cityType: 'artillery', units: 20, x: 100, y: 100 },
        { id: 'target', owner: 'enemy', units: 2, x: 100, y: 150 },
        { id: 'source', owner: 'player', units: 2, x: 100, y: 300 },
      ],
      rules,
    );
    const duration = ARTILLERY_FIRE_INTERVAL_MS * 2 + 1;
    const transfer: Transfer = {
      id: 1,
      sourceId: 'source',
      targetId: 'target',
      owner: 'player',
      units: 1,
      formationSize: 1,
      dotSlots: [0],
      from: { x: 100, y: 164 },
      to: { x: 100, y: 136 },
      durationMs: duration,
      elapsedMs: 0,
    };
    const state = { ...base, transfers: [transfer] };
    const coarse = advanceWorldStep(state, duration);
    const split = advanceWorldStep(advanceWorldStep(state, ARTILLERY_FIRE_INTERVAL_MS * 2), 1);
    expect(city(coarse, 'target')).toMatchObject({ owner: 'player', units: 1 });
    expect(city(split, 'target')).toEqual(city(coarse, 'target'));
    expect(coarse.artilleryShots?.at(-1)?.firedAtMs).toBeCloseTo(ARTILLERY_FIRE_INTERVAL_MS * 2);
    expect(split.artilleryShots).toEqual(coarse.artilleryShots);
  });

  it('resolves a Watchtower shot at its boundary before the subsequent ground arrival', () => {
    const base = createSimulation(
      [
        { id: 'source', owner: 'player', cityType: 'defender', units: 2, x: 0, y: 100 },
        { id: 'tower', owner: 'enemy', cityType: 'watchtower', units: 1, x: 100, y: 100 },
      ],
      rules,
    );
    const duration = WATCHTOWER_FIRE_INTERVAL_MS + 1;
    const state = {
      ...base,
      transfers: [
        {
          id: 1,
          sourceId: 'source',
          targetId: 'tower',
          owner: 'player',
          units: 1,
          formationSize: 1,
          dotSlots: [0],
          from: { x: 14, y: 100 },
          to: { x: 86, y: 100 },
          durationMs: duration,
          elapsedMs: 0,
        },
      ],
    };
    const coarse = advanceWorldStep(state, duration);
    const split = advanceWorldStep(advanceWorldStep(state, WATCHTOWER_FIRE_INTERVAL_MS), 1);
    expect(city(coarse, 'tower')).toMatchObject({ owner: 'enemy', units: 1 });
    expect(coarse.transfers).toEqual([]);
    expect(split).toEqual(coarse);
  });

  it('resets the full Artillery cooldown on same-timestamp capture and recapture', () => {
    const base = createSimulation(
      [
        { id: 'gun', owner: 'player', cityType: 'artillery', units: 1, x: 0, y: 0 },
        { id: 'enemy-city', owner: 'enemy', units: 10, x: 100, y: 0 },
      ],
      rules,
    );
    const almost = advanceWorldStep(base, ARTILLERY_FIRE_INTERVAL_MS - 10);
    const arrivals: Transfer[] = [
      {
        id: 1,
        sourceId: 'enemy-city',
        targetId: 'gun',
        owner: 'enemy',
        units: 2,
        formationSize: 2,
        dotSlots: [],
        from: { x: 100, y: 0 },
        to: { x: 14, y: 0 },
        durationMs: 1,
        elapsedMs: 1,
      },
      {
        id: 2,
        sourceId: 'enemy-city',
        targetId: 'gun',
        owner: 'player',
        units: 3,
        formationSize: 3,
        dotSlots: [],
        from: { x: -100, y: 0 },
        to: { x: -14, y: 0 },
        durationMs: 1,
        elapsedMs: 1,
      },
    ];
    const captured = resolveCombat({ ...almost, arrivals });
    expect(city(captured, 'gun')).toMatchObject({ owner: 'player', units: 2 });
    expect(captured.weaponTimers?.gun).toEqual({ owner: 'player', elapsedMs: 0 });
    const before = advanceWorldStep(captured, ARTILLERY_FIRE_INTERVAL_MS - 1);
    expect(city(before, 'enemy-city').units).toBe(10);
    expect(city(advanceWorldStep(before, 1), 'enemy-city').units).toBe(9);

    // Keep the same public command path exercised by grounded captures as well.
    expect(dispatchUnits(base, 'enemy-city', 'gun', 'enemy').transfers.length).toBeGreaterThan(0);
  });
});
