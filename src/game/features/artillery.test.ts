import { describe, expect, it } from 'vitest';

import { forecastBattle } from '@/game/ai/forecast';
import { resolveArrivalBatch } from '@/game/combat';
import { dispatchUnits } from '@/game/dispatch';
import { advanceRound } from '@/game/round';
import { ARTILLERY_FIRE_INTERVAL_MS } from '@/game/settings';
import { createSimulation } from '@/game/state';
import { createTerrain } from '@/game/terrain/terrain';
import type { Territory } from '@/game/types';
import { advanceWorldStep } from '@/game/world-step';

const cannon = { id: 'gun', kind: 'artillery' as const, range: 150, fireIntervalMs: 2000 };
const seeds: Territory[] = [
  {
    id: 'gun-city',
    owner: 'player',
    cityType: 'artillery',
    units: 20,
    x: 180,
    y: 240,
    features: [cannon],
  },
  { id: 'near', owner: 'enemy', units: 4, x: 180, y: 170 },
  { id: 'far', owner: 'enemy', units: 10, x: 260, y: 240 },
  { id: 'friend', owner: 'player', units: 10, x: 180, y: 280 },
  { id: 'neutral', owner: 'neutral', units: 8, x: 170, y: 240 },
];
const make = (cities = seeds) => createSimulation(cities, { unitsPerSecond: 0 });
const units = (state: ReturnType<typeof make>, id = 'near') =>
  state.territories.find((c) => c.id === id)!.units;

describe('Artillery garrison targeting', () => {
  it('fires exactly one defender at 2000ms, not before, never damaging airborne dots', () => {
    let state = dispatchUnits(make(), 'gun-city', 'far');
    state = advanceWorldStep(state, ARTILLERY_FIRE_INTERVAL_MS - 1);
    expect(units(state)).toBe(4);
    const transfers = state.transfers;
    state = advanceWorldStep(state, 1);
    expect(units(state)).toBe(3);
    expect(state.transfers.map((t) => t.units)).toEqual(transfers.map((t) => t.units));
    expect(state.artilleryShots).toMatchObject([
      { sourceId: 'gun-city', targetId: 'near', owner: 'player' },
    ]);
  });
  it('ignores friends, neutrals, empty cities and out-of-range cities; never captures alone', () => {
    const state = advanceWorldStep(
      make(seeds.map((c) => (c.id === 'far' ? { ...c, units: 100 } : c))),
      10000,
    );
    expect(units(state)).toBe(0);
    expect(state.territories.find((c) => c.id === 'gun-city')!.cityType).toBe('artillery');
    expect(state.territories.find((c) => c.id === 'near')!.owner).toBe('enemy');
    expect(units(state, 'far')).toBe(74);
    expect(units(state, 'friend')).toBe(10);
    expect(units(state, 'neutral')).toBe(8);
    const outside = make(
      seeds.map((c) => (c.id === 'near' ? { ...c, y: 89 } : c.id === 'far' ? { ...c, x: 331 } : c)),
    );
    expect(units(advanceWorldStep(outside, 4000))).toBe(4);
  });
  it('does not fire while neutral; captured control resets cadence and targets the new enemy', () => {
    let state = advanceWorldStep(
      make(seeds.map((c) => (c.id === 'gun-city' ? { ...c, owner: 'neutral' } : c))),
      10000,
    );
    state = {
      ...state,
      territories: state.territories.map((c) =>
        c.id === 'gun-city' ? { ...c, owner: 'enemy' } : c,
      ),
      weaponTimers: { 'gun-city': { owner: 'enemy', elapsedMs: 0 } },
    };
    state = advanceWorldStep(state, ARTILLERY_FIRE_INTERVAL_MS - 1);
    expect(units(state, 'friend')).toBe(10);
    state = advanceWorldStep(state, 1);
    expect(units(state, 'friend')).toBe(9);
    expect(units(state)).toBe(4);
  });
  it('starts a full new cadence after a real troop capture, then fires at the new hostile owner', () => {
    const cities = seeds.map((c) =>
      c.id === 'gun-city'
        ? { ...c, owner: 'neutral', cityType: 'artillery' as const, units: 1 }
        : c.id === 'friend'
          ? { ...c, units: 20 }
          : c,
    );
    const base = make(cities);
    const captured = resolveArrivalBatch(base, {
      targetId: 'gun-city',
      owner: 'player',
      units: 2,
    }).state;
    expect(captured.territories[0].owner).toBe('player');
    const almost = advanceWorldStep(captured, ARTILLERY_FIRE_INTERVAL_MS - 1);
    expect(units(almost)).toBe(4);
    expect(units(advanceWorldStep(almost, 1))).toBe(3);
  });
  it('does not bank idle shots; uses stable IDs for equal-distance ties', () => {
    let state = advanceWorldStep(
      make(seeds.map((c) => (c.owner === 'enemy' ? { ...c, units: 0 } : c))),
      ARTILLERY_FIRE_INTERVAL_MS,
    );
    state = {
      ...state,
      territories: state.territories.map((c) => (c.id === 'near' ? { ...c, units: 4 } : c)),
    };
    expect(units(advanceWorldStep(state, 1))).toBe(4);
    const tied = make(seeds.map((c) => (c.id === 'far' ? { ...c, x: 250 } : c)));
    expect(units(advanceWorldStep(tied, ARTILLERY_FIRE_INTERVAL_MS), 'far')).toBe(9); // far sorts before near
  });
  it('mountains block centre-to-centre shots, rivers do not', () => {
    const mountain = createTerrain({
      bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 },
      crossings: [],
      barriers: [
        { id: 'ridge', kind: 'mountain', bounds: { minX: 175, minY: 195, maxX: 185, maxY: 210 } },
      ],
    });
    const state = createSimulation(seeds, { unitsPerSecond: 0 }, undefined, mountain);
    const next = advanceWorldStep(state, ARTILLERY_FIRE_INTERVAL_MS);
    expect(units(next)).toBe(4);
    expect(units(next, 'far')).toBe(9);
    const river = createTerrain({
      ...mountain,
      barriers: mountain.barriers.map((b) => ({ ...b, kind: 'river' as const })),
    });
    expect(
      units(
        advanceWorldStep(
          createSimulation(seeds, { unitsPerSecond: 0 }, undefined, river),
          ARTILLERY_FIRE_INTERVAL_MS,
        ),
      ),
    ).toBe(3);
  });
  it('matches large and small steps, live rounds and forecasts including ownership after arrivals', () => {
    const state = dispatchUnits(make(), 'gun-city', 'near');
    expect(forecastBattle(state, 6000)).toEqual(advanceWorldStep(state, 6000));
    expect(advanceRound(state, 2000)).toEqual(advanceWorldStep(state, 2000));
    let small = state;
    for (let n = 0; n < 120; n++) small = advanceWorldStep(small, 50);
    const bulk = advanceWorldStep(state, 6000);
    const { elapsedMs: _bulkElapsed, ...bulkResult } = bulk;
    const { elapsedMs: _smallElapsed, ...smallResult } = small;
    expect(bulkResult).toEqual(smallResult);
    expect(bulk.elapsedMs).toBeCloseTo(small.elapsedMs, 8);
  });
  it('includes the exact range edge and treats every other faction as hostile', () => {
    const cities = seeds.map((c) =>
      c.id === 'near' ? { ...c, y: 90, owner: 'enemy-2' } : c.id === 'far' ? { ...c, x: 331 } : c,
    );
    expect(units(advanceWorldStep(make(cities), ARTILLERY_FIRE_INTERVAL_MS))).toBe(3);
  });
  it('orders simultaneous guns by stable city IDs, independent of authored array order', () => {
    const cities: Territory[] = [
      {
        id: 'z-gun',
        owner: 'player',
        cityType: 'artillery',
        units: 10,
        x: 180,
        y: 240,
        features: [{ ...cannon, id: 'z-feature' }],
      },
      {
        id: 'a-gun',
        owner: 'player',
        cityType: 'artillery',
        units: 10,
        x: 180,
        y: 270,
        features: [{ ...cannon, id: 'a-feature' }],
      },
      { id: 'victim', owner: 'enemy', units: 1, x: 180, y: 210 },
    ];
    const first = advanceWorldStep(make(cities), ARTILLERY_FIRE_INTERVAL_MS),
      second = advanceWorldStep(make([...cities].reverse()), ARTILLERY_FIRE_INTERVAL_MS);
    expect(first.artilleryShots).toEqual(second.artilleryShots);
    expect(first.artilleryShots).toMatchObject([{ sourceId: 'a-gun', targetId: 'victim' }]);
    expect(units(first, 'victim')).toBe(0);
  });
  it('expires shot feedback after 300ms and validates definitions', () => {
    const state = advanceWorldStep(make(), 2000);
    expect(advanceWorldStep(state, 300).artilleryShots).toEqual([]);
    expect(() =>
      make(
        seeds.map((c) => (c.id === 'gun-city' ? { ...c, features: [{ ...cannon, range: 0 }] } : c)),
      ),
    ).toThrow();
  });
});
