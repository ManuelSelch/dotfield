import { describe, expect, it } from 'vitest';
import { createRules, getFactionRules } from './rules';
import { createSimulation } from './state';
import { advanceGrowth } from './growth';
import { dispatchUnits } from './dispatch';
import { createRoute, orderDurationMs } from './route';
import { TERRITORIES } from '../board/map';

const rulesFor = (overrides = {}) => createRules({ factions: {
  player: { unitsPerSecond: 1.25, travelSpeed: 42, batchIntervalMs: 450, ...overrides },
  enemy: { unitsPerSecond: 1, travelSpeed: 35, batchIntervalMs: 600 },
} });

describe('per-faction rules', () => {
  it('grows player cities independently; enemies and neutrals stay baseline', () => {
    const state = advanceGrowth(createSimulation(TERRITORIES, rulesFor()), 4000);
    expect(state.territories.find(n => n.id === 'south')!.units).toBe(41);
    expect(state.territories.find(n => n.id === 'north')!.units).toBe(40);
    expect(state.territories.find(n => n.id === 'centre')!.units).toBe(20);
  });
  it('uses issuing-faction speed and cadence for orders and duration estimates', () => {
    const state = createSimulation(TERRITORIES, rulesFor());
    const source = state.territories.find(n => n.id === 'south')!;
    const target = state.territories.find(n => n.id === 'centre')!;
    const player = dispatchUnits(state, source.id, target.id);
    const enemy = dispatchUnits(state, 'north', target.id, 'enemy');
    expect(player.transfers[1].elapsedMs).toBe(-450);
    expect(enemy.transfers[1].elapsedMs).toBe(-600);
    expect(player.transfers[0].durationMs).toBeCloseTo(enemy.transfers[0].durationMs / 1.2);
    const rules = getFactionRules(state, 'player');
    expect(createRoute(source, target, rules).durationMs).toBe(player.transfers[0].durationMs);
    expect(orderDurationMs(source, target, 35, rules)).toBe(player.transfers[0].durationMs + 6 * 450);
  });
  it('snapshots rules and supports additional configuration IDs without shared objects', () => {
    const input = { factions: { player: { unitsPerSecond: 1, travelSpeed: 35, batchIntervalMs: 600 },
      enemy: { unitsPerSecond: 1, travelSpeed: 35, batchIntervalMs: 600 },
      'enemy-2': { unitsPerSecond: 2, travelSpeed: 30, batchIntervalMs: 800 } } };
    const rules = createRules(input); input.factions['enemy-2'].unitsPerSecond = 100;
    expect(rules.factions['enemy-2'].unitsPerSecond).toBe(2);
    expect(rules.factions.player).not.toBe(rules.factions.enemy);
  });
  it('rejects missing faction rules rather than falling back to another faction', () => {
    expect(() => createSimulation(TERRITORIES, { factions: {} })).toThrow();
    expect(() => getFactionRules(createSimulation(TERRITORIES), 'unknown')).toThrow();
  });
  it.each([{ unitsPerSecond: -1 }, { unitsPerSecond: Infinity }, { travelSpeed: 0 },
    { travelSpeed: NaN }, { batchIntervalMs: 0 }])('rejects invalid resolved values %s', override => {
    expect(() => rulesFor(override)).toThrow(RangeError);
  });
});
