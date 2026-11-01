import { describe, expect, it } from 'vitest';

import { TERRITORIES } from '@/board/map';
import { forecastBattle } from '@/game/ai/forecast';
import { resolveCombat } from '@/game/combat';
import { dispatchUnits } from '@/game/dispatch';
import { snapshotTerritories } from '@/game/features/snapshot';
import { advanceGrowth } from '@/game/growth';
import { advanceRound } from '@/game/round';
import { createRules, BASE_FACTION_RULES } from '@/game/rules';
import { createSession } from '@/game/session';
import { createSimulation } from '@/game/state';

import type { UpgradeId } from './catalog';
import { compileRoundSetup } from './compile';

const setup = () => compileRoundSetup(TERRITORIES, { player: ['industry'] });
const units = (state: ReturnType<typeof createSimulation>, id: string) =>
  state.territories.find((n) => n.id === id)!.units;

describe('Industry setup', () => {
  it('changes only selected factions and never mutates the baseline or source map', () => {
    const seed = setup();
    const state = advanceGrowth(createSimulation(seed.territories, seed.rules), 4000);
    expect(units(state, 'south')).toBe(41);
    expect(units(state, 'north')).toBe(40);
    expect(units(state, 'centre')).toBe(20);
    expect(BASE_FACTION_RULES.unitsPerSecond).toBe(1);
    expect(seed.territories).toEqual(snapshotTerritories(TERRITORIES));
    expect(seed.territories[0]).not.toBe(TERRITORIES[0]);
    expect(compileRoundSetup(TERRITORIES, {}).rules.factions.player.unitsPerSecond).toBe(1);
  });
  it('deduplicates selections and keeps different faction configurations independent', () => {
    const base = createRules({
      factions: {
        player: BASE_FACTION_RULES,
        enemy: BASE_FACTION_RULES,
        'enemy-2': { ...BASE_FACTION_RULES, unitsPerSecond: 2 },
      },
    });
    const result = compileRoundSetup(TERRITORIES, { player: ['industry', 'industry'] }, base);
    expect(result.rules.factions.player.unitsPerSecond).toBe(1.25);
    expect(result.rules.factions.enemy.unitsPerSecond).toBe(1);
    expect(result.rules.factions['enemy-2'].unitsPerSecond).toBe(2);
    expect(base.factions.player.unitsPerSecond).toBe(1);
  });
  it('resolves independent upgrades and AI behavior for each configured AI faction', () => {
    const map = [...TERRITORIES, { id: 'north-2', owner: 'enemy-2', units: 36, x: 90, y: 40 }];
    const result = compileRoundSetup(
      map,
      { player: [], enemy: ['industry'], 'enemy-2': ['factory'] },
      undefined,
      { enemy: 'aggressive', 'enemy-2': 'defensive' },
    );
    expect(result.rules.factions.enemy.unitsPerSecond).toBe(1.25);
    expect(result.rules.factions['enemy-2'].unitsPerSecond).toBe(1);
    expect(result.territories.find((city) => city.id === 'north-2')?.features?.[0]).toMatchObject({
      kind: 'factory',
      productionMultiplier: 2,
    });
    expect(result.ai.enemy!.decisionIntervalMs).toBeLessThan(
      result.ai['enemy-2']!.decisionIntervalMs,
    );
  });
  it('rejects unknown upgrade and faction IDs', () => {
    expect(() => compileRoundSetup(TERRITORIES, { player: ['unknown' as UpgradeId] })).toThrow();
    expect(() => compileRoundSetup(TERRITORIES, { unknown: ['industry'] })).toThrow();
  });
  it('uses the current city owner after captures, clearing old fractional growth', () => {
    const seed = setup();
    let state = advanceGrowth(createSimulation(seed.territories, seed.rules), 200);
    const player = dispatchUnits(state, 'south', 'centre').transfers[0];
    state = resolveCombat({ ...state, arrivals: [{ ...player, units: 21 }], transfers: [] });
    expect(state.territories.find((n) => n.id === 'centre')!.growthRemainder).toBe(0);
    state = advanceGrowth(state, 4000);
    expect(units(state, 'centre')).toBe(6);
    const enemy = dispatchUnits(state, 'north', 'centre', 'enemy').transfers[0];
    state = resolveCombat({ ...state, arrivals: [{ ...enemy, units: 7 }], transfers: [] });
    state = advanceGrowth(state, 4000);
    expect(units(state, 'centre')).toBe(5);
  });
  it('matches live and forecast counts with fractional faction growth and real orders', () => {
    const seed = setup();
    const state = dispatchUnits(createSimulation(seed.territories, seed.rules), 'south', 'centre');
    const predicted = forecastBattle(state, 10000);
    const live = advanceRound(state, 10000);
    expect(predicted.territories).toEqual(live.territories);
    expect(predicted.transfers).toEqual(live.transfers);
  });
  it('retains the setup on restart and never catches up paused or hidden time', () => {
    const seed = setup();
    const session = createSession(seed.territories, null, seed.rules);
    session.start();
    session.frame(0);
    session.frame(4000);
    expect(units(session.state, 'south')).toBe(41);
    session.pause();
    session.frame(60000);
    expect(units(session.state, 'south')).toBe(41);
    session.setHidden(true);
    session.resume();
    session.frame(90000);
    session.setHidden(false);
    session.frame(100000);
    session.frame(104000);
    expect(units(session.state, 'south')).toBe(46);
    session.restart();
    session.start();
    session.frame(0);
    session.frame(4000);
    expect(units(session.state, 'south')).toBe(41);
    expect(units(session.state, 'north')).toBe(40);
  });
  it('has the same fractional result in one update and many small updates', () => {
    const seed = setup();
    const state = createSimulation(seed.territories, seed.rules);
    let split = state;
    for (let i = 0; i < 600; i++) split = advanceGrowth(split, 1000 / 60);
    const whole = advanceGrowth(state, 10000);
    expect(split.territories.map((n) => n.units)).toEqual(whole.territories.map((n) => n.units));
    expect(split.territories.find((n) => n.id === 'south')!.growthRemainder).toBeCloseTo(500);
  });
});
