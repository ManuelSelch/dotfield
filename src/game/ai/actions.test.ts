import { describe, expect, it } from 'vitest';

import { launchAircraft } from '@/game/aircraft';
import { dispatchUnits } from '@/game/dispatch';
import { shieldRechargeSource } from '@/game/features/network-shields';
import { createRiver } from '@/game/river';
import { createSimulation } from '@/game/state';
import { createTerrain } from '@/game/terrain/terrain';
import type { SimulationState, Territory } from '@/game/types';
import { advanceWorldStep } from '@/game/world-step';

import { chooseAction, applyAiAction } from './actions';
import { resolveAiBehavior } from './behaviors';
import { DEFAULT_AI } from './config';
import { chooseOrder } from './decision';
import { forecastBattle } from './forecast';
import { factionArmyUnits } from './logistics';
import { advanceAi } from './tick';

const city = (
  id: string,
  owner: string,
  units: number,
  x: number,
  y = 0,
  cityType: Territory['cityType'] = 'production',
): Territory => ({ id, owner, units, x, y, cityType });
const ridge = createTerrain({
  bounds: { minX: -100, minY: -100, maxX: 600, maxY: 600 },
  crossings: [],
  barriers: [
    { id: 'ridge', kind: 'mountain', bounds: { minX: 150, minY: -90, maxX: 180, maxY: 590 } },
  ],
});
const ready = (state: SimulationState) => advanceWorldStep(state, 20_000);
const flying = (units = 41, faction = 'enemy') =>
  ready(
    createSimulation(
      [city('air', faction, units, 0, 0, 'airfield'), city('target', 'player', 5, 300)],
      { unitsPerSecond: 0 },
      undefined,
      ridge,
    ),
  );
const conversionBoard = () =>
  createSimulation(
    [
      city('home', 'enemy', 50, 0, 400),
      city('rear', 'enemy', 50, 0, 300),
      city('launch', 'enemy', 90, 0, 0),
      city('target', 'player', 12, 300),
    ],
    { unitsPerSecond: 0 },
    undefined,
    ridge,
  );

describe('conversion and flight actions', () => {
  it('keeps chooseOrder ground-only while launching useful partial and full flights through terrain', () => {
    for (const units of [21, 141]) {
      const state = flying(units);
      expect(chooseOrder(state)).toBeNull();
      const action = chooseAction(state);
      expect(action).toMatchObject({ type: 'airlift', sourceId: 'air', targetId: 'target' });
      const next = applyAiAction(state, action!, 'enemy');
      expect(next).toEqual(launchAircraft(state, 'air', 'target', 'enemy'));
      expect(next.aircraft!.air.cargo).toBe(Math.min(100, units - 1));
      expect(factionArmyUnits(next, 'enemy')).toBe(factionArmyUnits(state, 'enemy'));
    }
  });

  it('budgets actual plane capacity, not the whole garrison, when reinforcing a forward airfield', () => {
    const state = ready(
      createSimulation(
        [
          city('air', 'enemy', 201, 0, 0, 'airfield'),
          city('staging', 'enemy', 1, 0, 200, 'airfield'),
          city('target', 'player', 200, 0, 400),
        ],
        { unitsPerSecond: 0 },
      ),
    );
    expect(chooseAction(state)).toMatchObject({
      type: 'airlift',
      sourceId: 'air',
      targetId: 'staging',
    });
  });

  it('uses an airlift to rescue a friendly Defender across a barrier', () => {
    let state = ready(
      createSimulation(
        [
          city('air', 'enemy', 41, 0, 0, 'airfield'),
          city('front', 'enemy', 3, 300, 0, 'defender'),
          city('raider', 'player', 16, 420),
        ],
        { unitsPerSecond: 0 },
        undefined,
        ridge,
      ),
    );
    state = dispatchUnits(state, 'raider', 'front', 'player');
    const action = chooseAction(state);
    expect(action).toMatchObject({
      type: 'airlift',
      sourceId: 'air',
      targetId: 'front',
      kind: 'reinforce',
    });
    const delivered = forecastBattle(applyAiAction(state, action!, 'enemy'), 10_000);
    expect(delivered.territories.find((c) => c.id === 'front')!.owner).toBe('enemy');
  });

  it('uses core commands to reject stale and wrong-faction actions without spending troops', () => {
    const state = flying();
    const action = chooseAction(state)!;
    expect(applyAiAction(state, action, 'player')).toBe(state);
    const next = applyAiAction(state, action, 'enemy');
    expect(applyAiAction(next, action, 'enemy')).toBe(next);
    expect(chooseAction({ ...state, roundStatus: 'victory' })).toBeNull();
  });

  it('does not launch an insufficient shielded attack or sacrifice a threatened home', () => {
    const state = flying(11);
    expect(chooseAction({ ...state, captureShields: { target: { remaining: 3 } } })).toBeNull();
    const open = ready(
      createSimulation(
        [
          city('air', 'enemy', 41, 0, 0, 'airfield'),
          city('target', 'player', 5, 300),
          city('raider', 'player', 35, 0, 150),
        ],
        { unitsPerSecond: 0 },
      ),
    );
    const attacked = dispatchUnits(open, 'raider', 'air', 'player');
    expect(chooseAction(attacked)?.type).not.toBe('airlift');
  });

  it('converts one useful cross-barrier airfield while retaining producers and never switching roles', () => {
    const state = conversionBoard();
    const action = chooseAction(state);
    expect(action).toMatchObject({ type: 'convert', cityId: 'launch', cityType: 'airfield' });
    const converted = applyAiAction(state, action!, 'enemy');
    expect(converted.territories.find((c) => c.id === 'launch')!.units).toBe(60);
    expect(chooseAction(converted)?.type).not.toBe('convert');
    const few = createSimulation(
      [city('last', 'enemy', 100, 0), city('target', 'player', 10, 300)],
      { unitsPerSecond: 0 },
      undefined,
      ridge,
    );
    expect(chooseAction(few)).toBeNull();
  });

  it.each([36, 50])(
    'funds a useful conversion from %i-troop cities using real subsequent supply, not invented cargo',
    (units) => {
      let state = createSimulation(
        [
          city('home', 'enemy', units, 0, 400),
          city('rear', 'enemy', units, 0, 300),
          city('launch', 'enemy', units, 0, 0),
          city('target', 'player', units, 300),
        ],
        { unitsPerSecond: 0 },
        undefined,
        ridge,
      );
      const first = chooseAction(state);
      expect(first).toMatchObject({ type: 'convert', cityId: 'launch', cityType: 'airfield' });
      const army = factionArmyUnits(state, 'enemy');
      state = applyAiAction(state, first!, 'enemy');
      expect(factionArmyUnits(state, 'enemy')).toBe(army - 30);
      expect(chooseAction(state)).toMatchObject({ type: 'ground', targetId: 'launch' });
      for (let i = 0; i < 25; i++) {
        const action = chooseAction(state);
        if (action) state = applyAiAction(state, action, 'enemy');
        state = forecastBattle(state, 1800);
      }
      expect(state.territories.find((c) => c.id === 'target')!.owner).toBe('enemy');
    },
  );

  it('places a Defender at a held front, not on the original home or every city', () => {
    const state = createSimulation(
      [
        city('home', 'enemy', 40, 0, 500),
        city('rear', 'enemy', 40, 0, 400),
        city('front', 'enemy', 50, 0, 0),
        city('target', 'player', 150, 160),
      ],
      { unitsPerSecond: 0 },
    );
    const action = chooseAction(state);
    expect(action).toMatchObject({ type: 'convert', cityId: 'front', cityType: 'defender' });
    const next = applyAiAction(state, action!, 'enemy');
    expect(chooseAction(next)?.type).not.toBe('convert');
  });

  it('does not pay for Defender recharge already supplied by a maximum-tier network', () => {
    const nodes = [
      city('home', 'enemy', 1, 0, 400),
      ...Array.from({ length: 11 }, (_, i) => city(`rear-${i}`, 'enemy', 1, i * 20, 300)),
      city('front', 'enemy', 50, 0, 0),
      city('target', 'player', 150, 120),
    ];
    const initial = createSimulation(nodes, { unitsPerSecond: 0 });
    const state = {
      ...initial,
      rules: {
        factions: {
          ...initial.rules.factions,
          enemy: { ...initial.rules.factions.enemy, connectedDefense: true },
        },
      },
    };
    expect(shieldRechargeSource(state, 'front').capacity).toBe(3);
    expect(chooseAction(state)).toMatchObject({ type: 'convert', cityType: 'artillery' });
  });

  it('prefers a feasible expansion over an optional Artillery build', () => {
    const state = createSimulation(
      [
        city('home', 'enemy', 50, 0, 400),
        city('rear', 'enemy', 50, 0, 300),
        city('front', 'enemy', 50, 0, 0),
        city('neutral', 'neutral', 5, 200, 0),
      ],
      { unitsPerSecond: 0 },
    );
    expect(chooseAction(state, resolveAiBehavior('aggressive'))).toMatchObject({
      type: 'ground',
      kind: 'expand',
      targetId: 'neutral',
    });
  });

  it('converts an unthreatened producer into Artillery when no offense or assembly is available', () => {
    // A garrison beyond the whole faction's reach keeps assembly infeasible, so
    // the optional role build is evaluated.
    const cities = [
      city('home', 'enemy', 50, 0, 400),
      city('rear', 'enemy', 50, 0, 300),
      city('gun-site', 'enemy', 50, 0, 0),
      city('target', 'player', 500, 100, 0),
    ];
    const state = createSimulation(cities, { unitsPerSecond: 0 });
    const action = chooseAction(state);
    expect(action).toMatchObject({ type: 'convert', cityId: 'gun-site', cityType: 'artillery' });
    const built = applyAiAction(state, action!, 'enemy');
    expect(built.territories.find((city) => city.id === 'gun-site')).toMatchObject({
      cityType: 'artillery',
      units: 10,
    });
    expect(
      forecastBattle(built, 10_000).territories.find((city) => city.id === 'target')!.units,
    ).toBeLessThan(500);
    expect(chooseAction(built)).not.toMatchObject({ type: 'convert', cityType: 'artillery' });
  });

  it('builds a Watchtower when no offense or assembly is available', () => {
    const cities = [
      city('home', 'enemy', 50, 0, 400),
      city('rear', 'enemy', 50, 0, 300),
      city('tower-site', 'enemy', 50, 0, 100),
      city('raid-source', 'player', 500, 200, 0),
      city('raid-target', 'player', 500, 0, 200),
    ];
    const initial = createSimulation(cities, { unitsPerSecond: 0 });
    const state = dispatchUnits(initial, 'raid-source', 'raid-target', 'player');
    const action = chooseAction(state);
    expect(action).toMatchObject({ type: 'convert', cityId: 'tower-site', cityType: 'watchtower' });
    const built = applyAiAction(state, action!, 'enemy');
    expect(built.territories.find((city) => city.id === 'tower-site')).toMatchObject({
      cityType: 'watchtower',
      units: 20,
    });
    expect(chooseAction(built)).not.toMatchObject({ type: 'convert', cityType: 'watchtower' });
  });

  it('supplies a preparing airfield for barrier attacks but does not overfill a busy plane base', () => {
    const nodes = [
      city('rear', 'enemy', 50, 0, 100),
      city('air', 'enemy', 5, 0, 0, 'airfield'),
      city('target', 'player', 60, 300),
    ];
    const state = createSimulation(nodes, undefined, undefined, ridge);
    expect(chooseAction(state)).toMatchObject({
      type: 'ground',
      sourceId: 'rear',
      targetId: 'air',
    });
    const busy = launchAircraft(
      ready(
        createSimulation(
          nodes.map((c) => (c.id === 'air' ? { ...c, units: 202 } : c)),
          undefined,
          undefined,
          ridge,
        ),
      ),
      'air',
      'target',
      'enemy',
    );
    expect(chooseOrder(busy)).toBeNull();
  });

  it('does not risk loaded cargo against an available nearby home-loss threat', () => {
    const state = ready(
      createSimulation(
        [
          city('air', 'enemy', 41, 0, 0, 'airfield'),
          city('target', 'player', 5, 300),
          city('raider', 'player', 50, 0, 150),
        ],
        { unitsPerSecond: 0 },
      ),
    );
    expect(chooseAction(state)?.type).not.toBe('airlift');
  });

  it('uses independent faction identities and identical sync action execution', () => {
    const state = flying(41, 'enemy-2');
    const action = chooseAction(state, DEFAULT_AI, 'enemy-2')!;
    expect(action).toMatchObject({ type: 'airlift' });
    const ticked = advanceAi(state, { 'enemy-2': DEFAULT_AI });
    expect(ticked.aircraft).toEqual(applyAiAction(state, action, 'enemy-2').aircraft);
    expect(chooseAction(state)).toBeNull();
  });

  it('applies simultaneous independent faction decisions in the same stable order as the worker coordinator', () => {
    const state = ready(
      createSimulation(
        [
          city('one', 'enemy', 41, 0, 0, 'airfield'),
          city('two', 'enemy-2', 41, 0, 400, 'airfield'),
          city('target', 'player', 5, 300, 200),
        ],
        { unitsPerSecond: 0 },
        undefined,
        ridge,
      ),
    );
    let manual = state;
    for (const faction of ['enemy', 'enemy-2']) {
      const action = chooseAction(manual, DEFAULT_AI, faction);
      expect(action).toMatchObject({ type: 'airlift' });
      manual = applyAiAction(manual, action!, faction);
    }
    const ticked = advanceAi(state, { 'enemy-2': DEFAULT_AI, enemy: DEFAULT_AI });
    expect(ticked.territories).toEqual(manual.territories);
    expect(ticked.aircraft).toEqual(manual.aircraft);
    expect(ticked.nextAircraftTripId).toBe(3);
  });

  it('does not bounce cargo from one airfield supply sink to another', () => {
    const state = createSimulation(
      [
        city('air-a', 'enemy', 50, 0, 100, 'airfield'),
        city('air-b', 'enemy', 5, 0, 0, 'airfield'),
        city('target', 'player', 60, 300),
      ],
      { unitsPerSecond: 0 },
      undefined,
      ridge,
    );
    expect(chooseOrder(state)).toBeNull();
  });

  it('reinforces Defenders and still dispatches ordinary ground troops from busy airfields', () => {
    let state = ready(
      createSimulation(
        [
          city('air', 'enemy', 80, 0, 0, 'airfield'),
          city('front', 'enemy', 3, 120, 0, 'defender'),
          city('target', 'player', 30, 300),
        ],
        { unitsPerSecond: 0 },
      ),
    );
    state = launchAircraft(state, 'air', 'target', 'enemy');
    state = {
      ...state,
      territories: state.territories.map((c) => (c.id === 'air' ? { ...c, units: 30 } : c)),
    };
    state = dispatchUnits(state, 'target', 'front', 'player');
    expect(chooseAction(state)).toMatchObject({
      type: 'ground',
      sourceId: 'air',
      targetId: 'front',
    });
  });

  it('flies over an unpaired river without legalizing a ground order', () => {
    const nodes = [
      city('air', 'enemy', 30, 60, 100, 'airfield'),
      city('north', 'enemy', 1, 280, 190),
      city('south', 'player', 100, 280, 290),
      city('target', 'neutral', 5, 60, 350),
    ];
    const river = createRiver(
      {
        top: 225,
        bottom: 255,
        bridges: [{ id: 'bridge', northId: 'north', southId: 'south', width: 64 }],
      },
      nodes,
    );
    const state = ready(createSimulation(nodes, { unitsPerSecond: 0 }, river));
    expect(dispatchUnits(state, 'air', 'target', 'enemy')).toBe(state);
    expect(chooseAction(state)).toMatchObject({
      type: 'airlift',
      sourceId: 'air',
      targetId: 'target',
      kind: 'expand',
    });
  });

  it('allows safe air boarding from the network original home', () => {
    const state = flying();
    const upgraded = {
      ...state,
      rules: {
        factions: {
          ...state.rules.factions,
          enemy: { ...state.rules.factions.enemy, connectedDefense: true },
        },
      },
    };
    expect(chooseAction(upgraded)).toMatchObject({
      type: 'airlift',
      sourceId: 'air',
      targetId: 'target',
    });
  });

  it('does not repeatedly spend troops switching roles over subsequent decisions', () => {
    let state = conversionBoard();
    const conversions: string[] = [];
    for (let i = 0; i < 30; i++) {
      const action = chooseAction(state);
      if (action) {
        if (action.type === 'convert') conversions.push(`${action.cityId}:${action.cityType}`);
        state = applyAiAction(state, action, 'enemy');
      }
      state = forecastBattle(state, 1800);
    }
    expect(conversions).toEqual(['launch:airfield']);
  });

  it('retains emergency ground defense ahead of conversion spending', () => {
    let state = createSimulation([
      city('home', 'enemy', 50, 0, 400),
      city('reserve', 'enemy', 50, 0, 300),
      city('front', 'enemy', 3, 0, 200),
      city('target', 'player', 40, 0, 0),
    ]);
    state = dispatchUnits(state, 'target', 'front', 'player');
    expect(chooseAction(state)).toMatchObject({
      type: 'ground',
      targetId: 'front',
      kind: 'reinforce',
    });
  });
});

describe('aircraft and Defender forecast parity', () => {
  it.each([1_000, 4_000, 10_000, 30_000])(
    'replays shields, cargo and every phase at %i ms',
    (horizon) => {
      let state = flying(101);
      state = {
        ...state,
        territories: state.territories.map((c) =>
          c.id === 'target' ? { ...c, cityType: 'defender' } : c,
        ),
        captureShields: { target: { remaining: 3 } },
      };
      state = launchAircraft(state, 'air', 'target', 'enemy');
      let actual = state;
      for (let elapsed = 0; elapsed < horizon; elapsed += 50)
        actual = advanceWorldStep(actual, Math.min(50, horizon - elapsed));
      expect(forecastBattle(state, horizon)).toEqual(actual);
    },
  );

  it('does not skip Defender-only recharge events during otherwise quiet forecasts', () => {
    const state = createSimulation(
      [city('front', 'enemy', 20, 0, 0, 'defender'), city('player', 'player', 20, 300)],
      { unitsPerSecond: 0 },
    );
    let actual = state;
    for (let i = 0; i < 600; i++) actual = advanceWorldStep(actual, 50);
    expect(forecastBattle(state, 30_000)).toEqual(actual);
    expect(actual.captureShields.front.remaining).toBe(3);
  });

  it('destroys cargo on home loss and counts it once before loss', () => {
    let state = ready(
      createSimulation(
        [
          city('air', 'enemy', 41, 0, 0, 'airfield'),
          city('target', 'player', 5, 300),
          city('raider', 'player', 40, 0, 100),
        ],
        { unitsPerSecond: 0 },
      ),
    );
    state = dispatchUnits(
      launchAircraft(state, 'air', 'target', 'enemy'),
      'raider',
      'air',
      'player',
    );
    let actual = state;
    for (let i = 0; i < 200; i++) actual = advanceWorldStep(actual, 50);
    expect(forecastBattle(state, 10_000)).toEqual(actual);
    expect(factionArmyUnits(actual, 'enemy')).toBe(0);
  });
});
