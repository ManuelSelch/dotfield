import { describe, expect, it } from 'vitest';

import { forecastBattle } from '@/game/ai/forecast';
import { CaptureAgent } from '@/game/ai/mdsl/agent';
import { dispatchUnits } from '@/game/dispatch';
import { createSimulation } from '@/game/state';

import { ExecutionBudget } from './budget';
import { PROGRAM_LIMITS as L, ProgramBudgetError } from './limits';

const state = () =>
  createSimulation(
    [
      { id: 'home', owner: 'enemy', units: 30, x: 30, y: 30 },
      { id: 'target', owner: 'player', units: 1000, x: 150, y: 350 },
    ],
    { unitsPerSecond: 0 },
  );
describe('native per-decision and forecast work budgets', () => {
  it('bounds capabilities, forecasts and commands independently and resets only counters', () => {
    const b = new ExecutionBudget(),
      world = state();
    for (let i = 0; i < L.capabilities; i++) b.capability(world);
    expect(() => b.capability(world)).toThrow(/Capability/);
    for (let i = 0; i < L.forecasts; i++) b.forecast();
    expect(() => b.forecast()).toThrow(/Forecast/);
    b.dispatch(world, 'home', true);
    expect(() => b.dispatch(world, 'home', true)).toThrow(/Command/);
    b.reset();
    expect(() => {
      b.capability(world);
      b.forecast();
      b.dispatch(world, 'home', true);
    }).not.toThrow();
  });
  it('rejects observed and projected transfer load before allocation/dispatch', () => {
    const b = new ExecutionBudget();
    const world = state(),
      many = {
        ...world,
        territories: world.territories.map((c) => (c.id === 'home' ? { ...c, units: 700 } : c)),
      };
    expect(() => b.checkWorld(many)).not.toThrow();
    expect(() => b.dispatch(many, 'home')).toThrow(/Projected dispatch/);
    const alreadyBusy = dispatchUnits(many, 'home', 'target', 'enemy');
    expect(alreadyBusy.transfers.length).toBeGreaterThan(L.transfers);
    expect(() => b.worldStep(alreadyBusy)).toThrow(ProgramBudgetError);
  });
  it('rejects a ninth chosen source without silently dropping it or truncating source lists', () => {
    const world = createSimulation(
      [
        ...Array.from({ length: 9 }, (_, i) => ({
          id: `s${i}`,
          owner: 'enemy',
          units: 10,
          x: 30 + i * 10,
          y: 30,
        })),
        { id: 'target', owner: 'player', units: 1000, x: 150, y: 350 },
      ],
      { unitsPerSecond: 0 },
    );
    const b = new ExecutionBudget(),
      agent = new CaptureAgent(
        'enemy',
        () => world,
        () => world,
        undefined,
        1000,
        b,
      );
    agent.SelectCity('enemy', 'nearest-reachable', 'target');
    agent.SelectSources('target', 1, 'sources');
    agent.ClearSet('chosen');
    for (let i = 0; i < 8; i++) {
      agent.NextCity('sources', 'source');
      agent.AddToSet('chosen', 'source');
    }
    agent.NextCity('sources', 'source');
    expect(() => agent.AddToSet('chosen', 'source')).toThrow(/Chosen-source/);
    expect(() => agent.PlanCapture('target', 'sources', 15000, 'plan')).toThrow(/Chosen-source/);
    agent.clear();
  });
  it('charges internal weapon/aircraft physics loops, not just the outer forecast call', () => {
    let world = state();
    world = {
      ...world,
      territories: world.territories.map((c) =>
        c.id === 'home' ? { ...c, units: 600, cityType: 'watchtower' as const } : c,
      ),
    };
    world = dispatchUnits(world, 'home', 'target', 'enemy');
    expect(world.transfers.length).toBeLessThanOrEqual(L.transfers);
    const b = new ExecutionBudget();
    let charges = 0;
    expect(() =>
      forecastBattle(world, 15000, (s) => {
        charges++;
        b.worldStep(s);
      }),
    ).toThrow(/world-work/);
    expect(charges).toBeGreaterThan(3);
    expect(charges).toBeLessThan(20);
    expect(world.elapsedMs).toBe(0); // speculative stepping never changes the real world
  });
  it('keeps results identical when work remains within admission', () => {
    const world = dispatchUnits(state(), 'home', 'target', 'enemy');
    const b = new ExecutionBudget();
    expect(forecastBattle(world, 15000, b.worldStep)).toEqual(forecastBattle(world, 15000));
  });
});
