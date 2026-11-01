import { describe, expect, it } from 'vitest';

import { MAPS } from '@/board/maps';
import { forecastBattle } from '@/game/ai/forecast';
import { resolveCombat } from '@/game/combat';
import { dispatchUnits } from '@/game/dispatch';
import { advanceGrowth } from '@/game/growth';
import { advanceRound } from '@/game/round';
import { createSession } from '@/game/session';
import { createSimulation } from '@/game/state';
import type { Territory } from '@/game/types';
import { compileRoundSetup } from '@/game/upgrades/compile';

import { getTerritoryGrowthRate } from './growth-rate';

const units = (state: ReturnType<typeof createSimulation>, id = 'south') =>
  state.territories.find((n) => n.id === id)!.units;
const makeState = (industry = false) => {
  const setup = compileRoundSetup(MAPS[0].territories, {
    player: industry ? ['industry', 'factory'] : ['factory'],
  });
  return createSimulation(setup.territories, setup.rules);
};

describe('Factory city feature', () => {
  it.each(MAPS)(
    'attaches only to the starting player city on $id, never mutating the map',
    (map) => {
      const original = JSON.stringify(map.territories);
      const setup = compileRoundSetup(map.territories, { player: ['factory', 'factory'] });
      const state = advanceGrowth(createSimulation(setup.territories, setup.rules), 4000);
      const enemyStart = map.territories.find((city) => city.owner === 'enemy')!;
      expect(units(state)).toBe(44);
      expect(units(state, enemyStart.id)).toBe(enemyStart.units + 4);
      for (const city of map.territories.filter((c) => c.owner === 'neutral'))
        expect(units(state, city.id)).toBe(city.units);
      for (const city of map.territories.filter((c) => c.owner === 'player' && c.id !== 'south'))
        expect(units(state, city.id)).toBe(city.units + 4);
      expect(setup.territories.find((n) => n.id === 'south')!.features).toHaveLength(1);
      expect(JSON.stringify(map.territories)).toBe(original);
      expect(setup.rules.factions.player.unitsPerSecond).toBe(1);
    },
  );
  it('stacks with Industry independently of selection order, leaving other player cities at 1.25', () => {
    const seed: Territory[] = [
      ...MAPS[0].territories.map((n) => ({ ...n })),
      { id: 'ally', x: 20, y: 440, owner: 'player', units: 1 },
    ];
    const a = compileRoundSetup(seed, { player: ['factory', 'industry'] });
    const b = compileRoundSetup(seed, { player: ['industry', 'factory', 'factory'] });
    expect(a).toEqual(b);
    const state = advanceGrowth(createSimulation(a.territories, a.rules), 4000);
    expect(units(state)).toBe(46);
    expect(units(state, 'ally')).toBe(6);
    expect(units(state, 'north')).toBe(40);
  });
  it('finds the starting city by ownership, not hard-coded city names', () => {
    const setup = compileRoundSetup(
      [
        { id: 'home', owner: 'player', units: 1, x: 0, y: 0 },
        { id: 'foe', owner: 'enemy', units: 1, x: 100, y: 100 },
      ],
      { player: ['factory'] },
    );
    expect(setup.territories[0].features).toHaveLength(1);
    expect(() => compileRoundSetup([setup.territories[1]], { player: ['factory'] })).toThrow();
  });
  it('transfers its bonus on capture and recapture, resetting fractional growth', () => {
    let state = advanceGrowth(makeState(true), 100);
    const feature = state.territories.find((n) => n.id === 'south')!.features;
    const enemy = dispatchUnits(state, 'north', 'south', 'enemy').transfers[0];
    const garrison = units(state);
    state = resolveCombat({
      ...state,
      arrivals: [{ ...enemy, units: garrison + 1 }],
      transfers: [],
    });
    const captured = state.territories.find((n) => n.id === 'south')!;
    expect(captured.features).toEqual(feature);
    expect(captured.growthRemainder).toBe(0);
    expect(getTerritoryGrowthRate(state, captured)).toBe(2);
    state = advanceGrowth(state, 4000);
    expect(units(state)).toBe(9);
    state = resolveCombat({ ...state, arrivals: [{ ...enemy, owner: 'player', units: 10 }] });
    state = advanceGrowth(state, 4000);
    expect(units(state)).toBe(11);
  });
  it('accepts map-authored factories without a beneficiary and benefits every current owner', () => {
    const host: Territory = {
      id: 'plant',
      owner: 'neutral',
      units: 14,
      x: 80,
      y: 190,
      features: [{ id: 'plant:factory', kind: 'factory', productionMultiplier: 2 }],
    };
    const state = createSimulation([
      host,
      { id: 'home', owner: 'player', units: 36, x: 80, y: 290 },
      { id: 'foe', owner: 'enemy-2', units: 36, x: 80, y: 90 },
    ]);
    expect(getTerritoryGrowthRate(state, host)).toBe(0);
    for (const owner of ['player', 'enemy-2'])
      expect(getTerritoryGrowthRate(state, { ...host, owner })).toBe(2);
  });
  it('does not duplicate an authored spawn Factory when its upgrade is selected', () => {
    const host: Territory = {
      id: 'home',
      owner: 'player',
      units: 48,
      x: 80,
      y: 190,
      features: [{ id: 'home:factory', kind: 'factory', productionMultiplier: 2 }],
    };
    const setup = compileRoundSetup(
      [host, { id: 'foe', owner: 'enemy', units: 36, x: 80, y: 90 }],
      { player: ['industry', 'factory'] },
    );
    expect(setup.territories[0].features).toEqual(host.features);
    const state = createSimulation(setup.territories, setup.rules);
    expect(getTerritoryGrowthRate(state, state.territories[0])).toBe(2.5);
    expect(advanceGrowth(state, 4000).territories[0].units).toBe(50);
  });
  it('keeps neutral features inactive', () => {
    const state = makeState();
    const host = state.territories.find((n) => n.id === 'south')!;
    const neutral = { ...host, owner: 'neutral' as const };
    expect(getTerritoryGrowthRate(state, neutral)).toBe(0);
  });
  it('matches fractional/bulk growth and live forecasts with real orders', () => {
    const initial = makeState(true);
    let split = initial;
    for (let i = 0; i < 600; i++) split = advanceGrowth(split, 1000 / 60);
    expect(units(split)).toBe(units(advanceGrowth(initial, 10000)));
    const ordered = dispatchUnits(initial, 'south', 'centre');
    expect(forecastBattle(ordered, 10000).territories).toEqual(
      advanceRound(ordered, 10000).territories,
    );
  });
  it('snapshots nested definitions and retains them through paused/hidden restart', () => {
    const input = {
      id: 'home',
      owner: 'player' as const,
      x: 0,
      y: 0,
      units: 10,
      features: [
        { id: 'plant', kind: 'factory' as const, beneficiaryId: 'player', productionMultiplier: 2 },
      ],
    };
    const session = createSession(
      [input, { id: 'foe', owner: 'enemy', x: 100, y: 100, units: 10 }],
      null,
    );
    input.features[0].productionMultiplier = 100;
    input.features.length = 0;
    session.start();
    session.frame(0);
    session.frame(4000);
    expect(units(session.state, 'home')).toBe(18);
    session.pause();
    session.frame(60000);
    expect(units(session.state, 'home')).toBe(18);
    session.setHidden(true);
    session.resume();
    session.frame(80000);
    session.restart();
    session.start();
    session.setHidden(false);
    session.frame(0);
    session.frame(4000);
    expect(units(session.state, 'home')).toBe(18);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid Factory multiplier %s', (multiplier) => {
    const initial = makeState();
    const host = initial.territories.find((n) => n.id === 'south')!;
    const factory = host.features!.find((feature) => feature.kind === 'factory')!;
    expect(() =>
      createSimulation([{ ...host, features: [{ ...factory, productionMultiplier: multiplier }] }]),
    ).toThrow();
  });
  it('rejects duplicate feature IDs and unknown beneficiary IDs', () => {
    const state = makeState();
    const host = state.territories.find((n) => n.id === 'south')!;
    const feature = host.features!.find((feature) => feature.kind === 'factory')!;
    expect(() => createSimulation([{ ...host, features: [feature, feature] }])).toThrow();
    expect(() =>
      createSimulation([{ ...host, features: [{ ...feature, beneficiaryId: 'missing' }] }]),
    ).toThrow();
    expect(() => createSimulation([{ ...host }, { ...host, id: 'other' }])).toThrow();
  });
});
