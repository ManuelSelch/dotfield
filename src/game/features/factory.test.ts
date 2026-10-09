import { describe, expect, it } from 'vitest';
import { compileRoundSetup } from '../upgrades/compile';
import { createSimulation } from '../state';
import { advanceGrowth } from '../growth';
import { advanceRound } from '../round';
import { forecastBattle } from '../ai/forecast';
import { createSession } from '../session';
import { dispatchUnits } from '../dispatch';
import { resolveCombat } from '../combat';
import { getTerritoryGrowthRate } from './growthRate';
import { MAPS } from '../../board/maps';
import type { Territory } from '../types';

const units = (state: ReturnType<typeof createSimulation>, id = 'south') => state.territories.find(n => n.id === id)!.units;
const makeState = (industry = false) => {
  const setup = compileRoundSetup(MAPS[0].territories, { player: industry ? ['industry', 'factory'] : ['factory'] });
  return createSimulation(setup.territories, setup.rules);
};

describe('Factory city feature', () => {
  it.each(MAPS)('attaches only to the starting player city on $name, never mutating the map', map => {
    const setup = compileRoundSetup(map.territories, { player: ['factory', 'factory'] });
    const state = advanceGrowth(createSimulation(setup.territories, setup.rules), 4000);
    const enemyStart = map.territories.find(city => city.owner === 'enemy')!;
    expect(units(state)).toBe(44); expect(units(state, enemyStart.id)).toBe(enemyStart.units + 4);
    expect(units(state, 'centre')).toBe(20);
    expect(setup.territories.find(n => n.id === 'south')!.features).toHaveLength(1);
    expect(map.territories.every(n => n.features === undefined)).toBe(true);
    expect(setup.rules.factions.player.unitsPerSecond).toBe(1);
  });
  it('stacks with Industry independently of selection order, leaving other player cities at 1.25', () => {
    const seed: Territory[] = [...MAPS[0].territories.map(n => ({ ...n })),
      { id: 'ally', x: 20, y: 440, owner: 'player', units: 1 }];
    const a = compileRoundSetup(seed, { player: ['factory', 'industry'] });
    const b = compileRoundSetup(seed, { player: ['industry', 'factory', 'factory'] });
    expect(a).toEqual(b);
    const state = advanceGrowth(createSimulation(a.territories, a.rules), 4000);
    expect(units(state)).toBe(46); expect(units(state, 'ally')).toBe(6);
    expect(units(state, 'north')).toBe(40);
  });
  it('finds the starting city by ownership, not hard-coded city names', () => {
    const setup = compileRoundSetup([{ id: 'home', owner: 'player', units: 1, x: 0, y: 0 },
      { id: 'foe', owner: 'enemy', units: 1, x: 100, y: 100 }], { player: ['factory'] });
    expect(setup.territories[0].features).toHaveLength(1);
    expect(() => compileRoundSetup([setup.territories[1]], { player: ['factory'] })).toThrow();
  });
  it('stays on capture but is inactive for the enemy; recapture restores the bonus', () => {
    let state = advanceGrowth(makeState(true), 100);
    const feature = state.territories.find(n => n.id === 'south')!.features;
    const enemy = dispatchUnits(state, 'north', 'south', 'enemy').transfers[0];
    const garrison = units(state);
    state = resolveCombat({ ...state, arrivals: [{ ...enemy, units: garrison + 1 }], transfers: [] });
    const captured = state.territories.find(n => n.id === 'south')!;
    expect(captured.features).toEqual(feature); expect(captured.growthRemainder).toBe(0);
    expect(getTerritoryGrowthRate(state, captured)).toBe(1);
    state = advanceGrowth(state, 4000); expect(units(state)).toBe(5);
    state = resolveCombat({ ...state, arrivals: [{ ...enemy, owner: 'player', units: 6 }] });
    state = advanceGrowth(state, 4000); expect(units(state)).toBe(11);
  });
  it('keeps neutral features inactive', () => {
    const state = makeState(); const host = state.territories.find(n => n.id === 'south')!;
    const neutral = { ...host, owner: 'neutral' as const };
    expect(getTerritoryGrowthRate(state, neutral)).toBe(0);
  });
  it('matches fractional/bulk growth and live forecasts with real orders', () => {
    const initial = makeState(true); let split = initial;
    for (let i = 0; i < 600; i++) split = advanceGrowth(split, 1000 / 60);
    expect(units(split)).toBe(units(advanceGrowth(initial, 10000)));
    const ordered = dispatchUnits(initial, 'south', 'centre');
    expect(forecastBattle(ordered, 10000).territories).toEqual(advanceRound(ordered, 10000).territories);
  });
  it('snapshots nested definitions and retains them through paused/hidden restart', () => {
    const input = { id: 'home', owner: 'player' as const, x: 0, y: 0, units: 10,
      features: [{ id: 'plant', kind: 'factory' as const, beneficiaryId: 'player', productionMultiplier: 2 }] };
    const session = createSession([input, { id: 'foe', owner: 'enemy', x: 100, y: 100, units: 10 }], null);
    input.features[0].productionMultiplier = 100; input.features.length = 0;
    session.start(); session.frame(0); session.frame(4000); expect(units(session.state, 'home')).toBe(18);
    session.pause(); session.frame(60000); expect(units(session.state, 'home')).toBe(18);
    session.setHidden(true); session.resume(); session.frame(80000);
    session.restart(); session.start(); session.setHidden(false); session.frame(0); session.frame(4000);
    expect(units(session.state, 'home')).toBe(18);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid Factory multiplier %s', multiplier => {
    const initial = makeState(); const host = initial.territories.find(n => n.id === 'south')!;
    const factory = host.features!.find(feature => feature.kind === 'factory')!;
    expect(() => createSimulation([{ ...host, features: [{ ...factory, productionMultiplier: multiplier }] }])).toThrow();
  });
  it('rejects duplicate feature IDs and unknown beneficiary IDs', () => {
    const state = makeState(); const host = state.territories.find(n => n.id === 'south')!;
    const feature = host.features!.find(feature => feature.kind === 'factory')!;
    expect(() => createSimulation([{ ...host, features: [feature, feature] }])).toThrow();
    expect(() => createSimulation([{ ...host, features: [{ ...feature, beneficiaryId: 'missing' }] }])).toThrow();
    expect(() => createSimulation([{ ...host }, { ...host, id: 'other' }])).toThrow();
  });
});
