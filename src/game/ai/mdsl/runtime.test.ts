import { describe, expect, it, vi } from 'vitest';
import { State } from 'mistreevous';
import { createSimulation } from '../../state';
import { applyAiAction } from '../actions';
import { forecastBattle } from '../forecast';
import { dispatchUnits } from '../../dispatch';
import { createRiver } from '../../river';
import { createTerrain } from '../../terrain/terrain';
import type { SimulationState, Territory } from '../../types';
import { CaptureAgent, createMdslBot } from './runtime';

const cities: Territory[] = [
  { id: 'home', owner: 'enemy', units: 36, x: 60, y: 80 },
  { id: 'near', owner: 'neutral', units: 5, x: 60, y: 190 },
  { id: 'far', owner: 'neutral', units: 5, x: 180, y: 290 },
  { id: 'player', owner: 'player', units: 36, x: 300, y: 400 },
];
function harness(opening = cities, faction = 'enemy') {
  let state = createSimulation(opening, { unitsPerSecond: 0 });
  const events = vi.fn();
  const dispatch = vi.fn((action: Parameters<typeof applyAiAction>[1]) => {
    state = applyAiAction(state, action, faction); return state;
  });
  const read = () => state;
  return { read, set: (next: SimulationState) => { state = next; }, events, dispatch,
    agent: new CaptureAgent(faction, read, dispatch, events),
    bot: () => createMdslBot(faction, read, dispatch, events) };
}
function prepare(agent: CaptureAgent) {
  expect(agent.SelectCity('neutral', 'nearest-reachable', 'target')).toBe(State.SUCCEEDED);
  expect(agent.SelectSources('target', 6, 'sources')).toBe(State.SUCCEEDED);
  return agent.PlanCapture('target', 'sources', 15000, 'plan');
}

describe('minimal real-game MDSL agent', () => {
  const attackCities: Territory[] = [
    { id: 'home', owner: 'enemy', units: 36, x: 60, y: 80 },
    { id: 'victim', owner: 'player', units: 5, x: 60, y: 190 },
    { id: 'player-home', owner: 'player', units: 36, x: 300, y: 400 },
  ];
  it('uses the same capabilities to capture an enemy after neutral expansion is unavailable', () => {
    const h = harness(attackCities), bot = h.bot();
    expect(bot.step()).toBe(State.RUNNING);
    expect(h.dispatch).toHaveBeenCalledOnce();
    expect(h.dispatch.mock.lastCall![0]).toMatchObject({ type: 'ground', kind: 'attack', sourceId: 'home', targetId: 'victim' });
    bot.step();
    expect(h.dispatch).toHaveBeenCalledOnce();
    h.set(forecastBattle(h.read(), 10000));
    expect(h.read().territories.find(c => c.id === 'victim')?.owner).toBe('enemy');
    expect(bot.step()).toBe(State.SUCCEEDED);
  });
  it('falls through to an enemy attack when a remaining neutral cannot be captured', () => {
    const h = harness([...attackCities, { id: 'neutral', owner: 'neutral', units: 200, x: 140, y: 80 }]);
    h.bot().step();
    expect(h.dispatch.mock.lastCall![0]).toMatchObject({ kind: 'attack', targetId: 'victim' });
  });
  it('retains neutral expansion priority when both tactics are feasible', () => {
    const h = harness([...attackCities, { id: 'neutral', owner: 'neutral', units: 5, x: 140, y: 80 }]);
    h.bot().step();
    expect(h.dispatch.mock.lastCall![0]).toMatchObject({ kind: 'expand', targetId: 'neutral' });
  });
  it('defines enemy relative to the acting faction, not the literal enemy ID', () => {
    const h = harness([
      { id: 'mine', owner: 'enemy-2', units: 36, x: 60, y: 80 },
      { id: 'neutral', owner: 'neutral', units: 1, x: 60, y: 110 },
      { id: 'ally', owner: 'enemy-2', units: 1, x: 60, y: 140 },
      { id: 'hostile', owner: 'enemy', units: 5, x: 60, y: 190 },
      { id: 'player', owner: 'player', units: 36, x: 300, y: 400 },
    ], 'enemy-2');
    expect(h.agent.SelectCity('enemy', 'nearest-reachable', 'target')).toBe(State.SUCCEEDED);
    expect(h.events).toHaveBeenLastCalledWith(expect.objectContaining({ targetId: 'hostile' }));
    expect(h.agent.SelectSources('target', 6, 'sources')).toBe(State.SUCCEEDED);
    expect(h.agent.PlanCapture('target', 'sources', 15000, 'plan')).toBe(State.SUCCEEDED);
    expect(h.agent.ExecutePlan('plan')).toBe(State.RUNNING);
    expect(h.read().transfers.every(t => t.owner === 'enemy-2' && t.targetId === 'hostile')).toBe(true);
  });
  it('forecasts enemy production and shields instead of attacking on garrison count alone', () => {
    for (const defense of ['growth', 'shields']) {
      const h = harness(attackCities.map(c => c.id === 'home' ? { ...c, units: 20 } : c));
      const state = h.read();
      h.set(defense === 'growth' ? { ...state, rules: { factions: { ...state.rules.factions,
        player: { ...state.rules.factions.player, unitsPerSecond: 4 } } } }
        : { ...state, captureShields: { victim: { remaining: 10 } } });
      expect(h.bot().step()).toBe(State.FAILED);
      expect(h.dispatch).not.toHaveBeenCalled();
    }
  });
  it('permits a winning final enemy capture even though player-relative status becomes defeat', () => {
    const h = harness(attackCities.filter(c => c.id !== 'player-home'));
    // Relay forecasts evaluate conquest boundaries and report a player-relative
    // defeat even when this acting faction is the winner.
    h.set({ ...h.read(), relay: { cityId: 'victim', activateAtMs: 120000, targetMs: 180000, scoresMs: {} } });
    expect(h.bot().step()).toBe(State.RUNNING);
    h.set(forecastBattle(h.read(), 10000));
    expect(h.read().territories.find(c => c.id === 'victim')?.owner).toBe('enemy');
    expect(h.read().roundStatus).toBe('defeat');
  });
  it('does not interrupt a running attack merely because a neutral candidate appears', () => {
    const h = harness(attackCities), bot = h.bot(); bot.step();
    h.set({ ...h.read(), territories: [...h.read().territories,
      { id: 'new-neutral', owner: 'neutral', units: 1, x: 140, y: 80, growthRemainder: 0 }] });
    expect(bot.step()).toBe(State.RUNNING);
    expect(h.dispatch).toHaveBeenCalledOnce();
    expect(h.dispatch.mock.lastCall![0]).toMatchObject({ targetId: 'victim' });
  });
  it('selects and plans without changing game state or issuing commands', () => {
    const h = harness(), before = h.read();
    expect(prepare(h.agent)).toBe(State.SUCCEEDED);
    expect(h.read()).toBe(before);
    expect(h.dispatch).not.toHaveBeenCalled();
    expect(h.events).toHaveBeenCalledWith(expect.objectContaining({ method: 'PlanCapture', targetId: 'near', sourceId: 'home' }));
  });
  it('keeps one running plan across steps, dispatches once and completes on real capture', () => {
    const h = harness(), bot = h.bot();
    expect(bot.step()).toBe(State.RUNNING);
    expect(h.dispatch).toHaveBeenCalledOnce();
    const orderIds = h.read().transfers.map(t => t.id);
    bot.step(); bot.step();
    expect(h.dispatch).toHaveBeenCalledOnce();
    expect(h.read().transfers.map(t => t.id)).toEqual(orderIds);
    h.set(forecastBattle(h.read(), 10000));
    expect(h.read().territories.find(c => c.id === 'near')?.owner).toBe('enemy');
    expect(bot.step()).toBe(State.SUCCEEDED);
    expect(h.events).toHaveBeenCalledWith(expect.objectContaining({ method: 'ReleasePlan', outcome: 'completed' }));
    bot.step();
    expect(h.dispatch).toHaveBeenCalledTimes(2);
    expect(h.dispatch.mock.lastCall![0]).toMatchObject({ targetId: 'far' });
  });
  it('rejects infeasible captures and clears previous plan outputs', () => {
    const h = harness();
    expect(prepare(h.agent)).toBe(State.SUCCEEDED);
    h.set({ ...h.read(), territories: h.read().territories.map(c => c.id === 'near' ? { ...c, units: 200 } : c) });
    expect(h.agent.PlanCapture('target', 'sources', 15000, 'plan')).toBe(State.FAILED);
    expect(h.agent.ExecutePlan('plan')).toBe(State.FAILED);
    expect(h.dispatch).not.toHaveBeenCalled();
  });
  it('clears failed target/source selections instead of reusing old slots', () => {
    const h = harness(); prepare(h.agent);
    h.set({ ...h.read(), territories: h.read().territories.filter(c => c.owner !== 'neutral') });
    expect(h.agent.SelectCity('neutral', 'nearest-reachable', 'target')).toBe(State.FAILED);
    expect(h.agent.SelectSources('target', 6, 'sources')).toBe(State.FAILED);
    expect(h.agent.PlanCapture('target', 'sources', 15000, 'plan')).toBe(State.FAILED);
  });
  it('revalidates changed source strength and access immediately before dispatch', () => {
    const h = harness(); prepare(h.agent);
    h.set({ ...h.read(), territories: h.read().territories.map(c => c.id === 'home' ? { ...c, units: 2 } : c) });
    expect(h.agent.ExecutePlan('plan')).toBe(State.FAILED);
    expect(h.dispatch).not.toHaveBeenCalled();
  });
  it('does not retry rejected commands inside a running plan', () => {
    const h = harness(); prepare(h.agent);
    h.dispatch.mockImplementation(() => h.read());
    expect(h.agent.ExecutePlan('plan')).toBe(State.FAILED);
    expect(h.agent.ExecutePlan('plan')).toBe(State.FAILED);
    expect(h.dispatch).toHaveBeenCalledOnce();
  });
  it('fails if orders disappear without securing the target', () => {
    const h = harness(); prepare(h.agent); h.agent.ExecutePlan('plan');
    h.set({ ...h.read(), transfers: [] });
    expect(h.agent.ExecutePlan('plan')).toBe(State.FAILED);
    expect(h.dispatch).toHaveBeenCalledOnce();
  });
  it('excludes busy sources after reload and isolates faction ownership', () => {
    const h = harness(cities.map(c => c.owner === 'enemy' ? { ...c, owner: 'enemy-2' } : c), 'enemy-2');
    h.bot().step();
    const reloaded = createMdslBot('enemy-2', h.read, h.dispatch, h.events);
    reloaded.step();
    expect(h.dispatch).toHaveBeenCalledOnce();
    expect(h.read().transfers.every(t => t.owner === 'enemy-2')).toBe(true);
  });
  it('honors the authored forecast bound and minimum army', () => {
    const h = harness();
    h.agent.SelectCity('neutral', 'nearest-reachable', 'target');
    expect(h.agent.SelectSources('target', 100, 'sources')).toBe(State.FAILED);
    h.agent.SelectSources('target', 6, 'sources');
    expect(h.agent.PlanCapture('target', 'sources', 1, 'plan')).toBe(State.FAILED);
  });
  it('fails on source loss or timeout and cleanup never recalls issued troops', () => {
    for (const mode of ['loss', 'timeout']) {
      const h = harness(); prepare(h.agent); h.agent.ExecutePlan('plan');
      const live = h.read();
      h.set(mode === 'loss' ? { ...live, territories: live.territories.map(c => c.id === 'home' ? { ...c, owner: 'player' } : c) }
        : { ...live, elapsedMs: 20000 });
      expect(h.agent.ExecutePlan('plan')).toBe(State.FAILED);
      const before = h.read();
      h.agent.ReleasePlan({ succeeded: false, aborted: true }, 'plan');
      h.agent.ReleasePlan({ succeeded: false, aborted: true }, 'plan');
      expect(h.read()).toBe(before);
      expect(h.read().transfers).toBe(live.transfers);
    }
  });
  it('uses real shields when deciding whether a capture is feasible', () => {
    const h = harness();
    h.set({ ...h.read(), captureShields: { near: { remaining: 10 } } });
    expect(prepare(h.agent)).toBe(State.FAILED);
    expect(h.dispatch).not.toHaveBeenCalled();
  });
  it('tries another selected source when the nearest source cannot capture', () => {
    const h = harness([
      { ...cities[0], units: 7 }, ...cities.slice(1),
      { id: 'backup', owner: 'enemy', units: 50, x: 90, y: 70 },
    ]);
    h.set({ ...h.read(), territories: h.read().territories.map(c => c.id === 'near' ? { ...c, units: 20 } : c) });
    expect(prepare(h.agent)).toBe(State.SUCCEEDED);
    expect(h.events).toHaveBeenCalledWith(expect.objectContaining({ method: 'PlanCapture', sourceId: 'backup' }));
  });
  it('respects Defender, mountain and paired-river access and revalidates changed access', () => {
    const opening: Territory[] = [
      { id: 'home', owner: 'enemy', units: 36, x: 60, y: 80 },
      { id: 'near', owner: 'neutral', units: 5, x: 60, y: 390 },
      { id: 'wall', owner: 'player', units: 10, x: 60, y: 240, cityType: 'defender' },
    ];
    expect(harness(opening).agent.SelectCity('neutral', 'nearest-reachable', 'target')).toBe(State.FAILED);
    const h = harness(opening.filter(c => c.id !== 'wall'));
    expect(prepare(h.agent)).toBe(State.SUCCEEDED);
    const terrain = createTerrain({ bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 },
      barriers: [{ id: 'ridge', kind: 'mountain', bounds: { minX: 0, minY: 200, maxX: 360, maxY: 280 } }], crossings: [] });
    h.set({ ...h.read(), terrain });
    expect(h.agent.ExecutePlan('plan')).toBe(State.FAILED);
    expect(h.dispatch).not.toHaveBeenCalled();
    const riverCities = [...h.read().territories,
      { id: 'north', owner: 'player', units: 1, x: 280, y: 190, growthRemainder: 0 },
      { id: 'south', owner: 'player', units: 1, x: 280, y: 290, growthRemainder: 0 }];
    h.set({ ...h.read(), terrain: undefined, territories: riverCities, river: createRiver({
      top: 220, bottom: 260, bridges: [{ id: 'bridge', northId: 'north', southId: 'south', width: 50 }],
    }, riverCities) });
    expect(h.agent.SelectCity('neutral', 'nearest-reachable', 'target')).toBe(State.FAILED);
  });
  it('does not duplicate another source’s committed target after reload', () => {
    const h = harness([...cities, { id: 'backup', owner: 'enemy', units: 36, x: 100, y: 80 }]);
    h.set(dispatchUnits(h.read(), 'home', 'near', 'enemy'));
    h.bot().step();
    expect(h.dispatch.mock.calls.every(([a]) => a.type !== 'ground' || a.targetId !== 'near')).toBe(true);
  });
  it('rejects a capture that forecasts losing its source to known orders', () => {
    const h = harness(cities.map(c => c.id === 'player' ? { ...c, units: 200, x: 100, y: 80 } : c));
    h.set(dispatchUnits(h.read(), 'player', 'home', 'player'));
    expect(prepare(h.agent)).toBe(State.FAILED);
  });
  it('uses simulation time, not wall time, for source-authored wait nodes', () => {
    const h = harness();
    const bot = createMdslBot('enemy', h.read, h.dispatch, h.events,
      'root { sequence { wait [2000] action [SelectCity, "neutral", "nearest-reachable", "target"] } }');
    expect(bot.step()).toBe(State.RUNNING);
    h.set({ ...h.read(), elapsedMs: 1000 });
    expect(bot.step()).toBe(State.RUNNING);
    h.set({ ...h.read(), elapsedMs: 2100 });
    expect(bot.step()).toBe(State.SUCCEEDED);
  });
  it('cleanup and disposal do not cancel live game orders or permit further steps', () => {
    const h = harness(), bot = h.bot();
    bot.step(); const before = h.read();
    bot.dispose(); bot.step();
    expect(h.read()).toBe(before);
    expect(h.dispatch).toHaveBeenCalledOnce();
  });
  it('never dispatches after round completion and rejects unsupported policy names', () => {
    const h = harness(); prepare(h.agent);
    h.set({ ...h.read(), roundStatus: 'defeat' });
    expect(h.agent.ExecutePlan('plan')).toBe(State.FAILED);
    expect(h.dispatch).not.toHaveBeenCalled();
    expect(() => h.agent.SelectCity('unknown', 'nearest-reachable', 'target')).toThrow();
  });
});
