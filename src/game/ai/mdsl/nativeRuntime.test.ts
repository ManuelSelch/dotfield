import { describe, expect, it, vi } from 'vitest';
import { State } from 'mistreevous';
import type { RootNodeDefinition } from 'mistreevous/dist/BehaviourTreeDefinition';
import { createSimulation } from '../../state';
import { forecastBattle } from '../forecast';
import { applyAiAction } from '../actions';
import type { Territory } from '../../types';
import { createMdslBot, createProgramBot } from './runtime';
import { compileProject } from '../../../botEditor/compiler';
import { directProject } from '../../../botEditor/fixtures/directProject';
import { PROGRAM_LIMITS } from '../program/limits';

function definition() {
  const r = compileProject(directProject());if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));return r.program.definition;
}
const cities: Territory[] = [
  { id: 'a', owner: 'enemy', units: 30, x: 60, y: 80 },
  { id: 'b', owner: 'enemy', units: 30, x: 120, y: 80 },
  { id: 'target', owner: 'player', units: 45, x: 60, y: 190 },
  { id: 'other', owner: 'player', units: 100, x: 300, y: 400 },
];
function harness(input: string | RootNodeDefinition = definition(), opening = cities) {
  let state = createSimulation(opening, { unitsPerSecond: 0 });
  const events = vi.fn(), faults = vi.fn();
  const apply = vi.fn((action: Parameters<typeof applyAiAction>[1]) => { state = applyAiAction(state, action, 'enemy');return state; });
  const bot = createMdslBot('enemy', () => state, apply, events, input, 1000, { onFault: faults });
  return { bot, apply, events, faults, read: () => state, advance: (ms: number) => { state = forecastBattle(state, ms); } };
}
describe('admitted native program execution', () => {
  it('captures with two sources, preserving retry/RUNNING/acknowledged cadence and cleanup', () => {
    const h = harness();
    expect(h.bot.step()).toBe(State.RUNNING);expect(h.apply).not.toHaveBeenCalled();
    expect(h.bot.step()).toBe(State.RUNNING);expect(h.apply).toHaveBeenCalledOnce();
    h.advance(1000);h.bot.step();expect(h.apply).toHaveBeenCalledTimes(2);
    h.advance(12000);expect(h.bot.step()).toBe(State.SUCCEEDED);
    expect(h.events).toHaveBeenCalledWith(expect.objectContaining({ method: 'ReleasePlan', outcome: 'completed', planSlot: 'e-plan' }));
    expect(h.bot.fault).toBeNull();expect(h.faults).not.toHaveBeenCalled();h.bot.dispose();
  });
  it('keeps the untrusted native entry separate from the legacy MDSL string path', () => {
    const state = createSimulation(cities);
    expect(() => createProgramBot('enemy', () => state, () => state, 'root { action [ClearSet, "x"] }')).toThrow(/native/i);
  });
  it('captures with one source, retains RUNNING cadence and abort-cleans without recalling orders', () => {
    const opening = [cities[0], { ...cities[2], owner: 'neutral', units: 5 }, cities[3]];
    const h = harness(definition(), opening);
    expect(h.bot.step()).toBe(State.RUNNING);expect(h.apply).toHaveBeenCalledOnce();
    expect(h.bot.step()).toBe(State.RUNNING);expect(h.apply).toHaveBeenCalledOnce();
    const before = h.read();h.bot.dispose();h.bot.dispose();h.bot.step();
    expect(h.read()).toBe(before);expect(h.apply).toHaveBeenCalledOnce();
    expect(h.events).toHaveBeenCalledWith(expect.objectContaining({ method: 'ReleasePlan', outcome: 'aborted' }));
  });
  it('matches the trusted MDSL capability trace and actual state through the same capture', () => {
    const native = harness();
    // Construct the trusted handwritten default independently.
    let state = createSimulation(cities, { unitsPerSecond: 0 });const events = vi.fn();
    const legacy = createMdslBot('enemy', () => state, action => { state = applyAiAction(state, action, 'enemy');return state; }, events);
    for (const ms of [0, 0, 1000, 12000]) {
      if (ms) {native.advance(ms);state = forecastBattle(state, ms);}
      expect(native.bot.step()).toBe(legacy.step());expect(native.read()).toEqual(state);
    }
    const normalize = (calls: unknown[][]) => calls.map(([event]) => {
      const e = event as Record<string, unknown>;return { ...e, ...(e.planSlot ? { planSlot: 'plan' } : {}) };
    });
    expect(normalize(native.events.mock.calls)).toEqual(normalize(events.mock.calls));
    native.bot.dispose();legacy.dispose();
  });
  it('rejects malformed/unallowlisted persisted JSON before constructing an executable runtime', () => {
    const malicious = { type: 'root', child: { type: 'action', call: 'clear', args: [] } } as RootNodeDefinition;
    expect(() => harness(malicious)).toThrow(/native|method|action/i);
  });
  it('distinguishes expected FAILED from faults and freezes caller-owned definitions', () => {
    const input = structuredClone(definition()), h = harness(input, [cities[3], { ...cities[0], units: 1 }]);
    input.child = { type: 'action', call: 'clear', args: [] };
    let outcome = h.bot.step();
    for (let i = 0; i < 8 && outcome === State.RUNNING; i++) outcome = h.bot.step();
    expect(outcome).toBe(State.FAILED);
    expect(h.bot.fault).toBeNull();expect(h.faults).not.toHaveBeenCalled();h.bot.dispose();
  });
  it('stops on unexpected host faults, reports once, clears plans and never dispatches again', () => {
    let state = createSimulation(cities, { unitsPerSecond: 0 });const faults = vi.fn(), events = vi.fn();
    const apply = vi.fn(() => { throw new Error('host exploded'); });
    const bot = createMdslBot('enemy', () => state, apply, events, definition(), 1000, { onFault: faults });
    bot.step();expect(bot.step()).toBe(State.FAILED);
    expect(bot.fault?.message).toContain('host exploded');expect(faults).toHaveBeenCalledOnce();
    expect(events).toHaveBeenCalledWith(expect.objectContaining({ method: 'ReleasePlan', outcome: 'aborted' }));
    bot.step();bot.dispose();expect(apply).toHaveBeenCalledOnce();expect(faults).toHaveBeenCalledOnce();
  });
  it('rejects expensive observed/projected worlds before forecasting or issuing orders', () => {
    const h = harness(definition(), cities.map((c, i) => i === 0 ? { ...c, units: 10000 } : c));
    expect(h.bot.step()).toBe(State.FAILED);expect(h.bot.fault?.code).toBe('budget');expect(h.apply).not.toHaveBeenCalled();h.bot.dispose();
  });
  it('contains reporter errors and stays faulted after an observer throws during planning', () => {
    const state = createSimulation(cities, { unitsPerSecond: 0 }), apply = vi.fn(() => state);
    const faults = vi.fn(() => { throw new Error('reporter failed'); });
    const observe = vi.fn((e: { method: string }) => { if (e.method === 'PlanCapture' || e.method === 'ReleasePlan') throw new Error('observer failed'); });
    const bot = createProgramBot('enemy', () => state, apply, definition(), { observe, onFault: faults });
    expect(bot.step()).toBe(State.FAILED);expect(bot.fault?.message).toBe('observer failed');
    bot.step();bot.dispose();expect(faults).toHaveBeenCalledOnce();expect(apply).not.toHaveBeenCalled();
  });
  it('enforces a per-decision capability budget without mistaking it for an ordinary failure', () => {
    const input: RootNodeDefinition = { type: 'root', child: { type: 'sequence', children: Array.from({ length: PROGRAM_LIMITS.capabilities + 1 }, () => ({ type: 'action', call: 'ClearSet', args: ['chosen'] })) } };
    const h = harness(input);expect(h.bot.step()).toBe(State.FAILED);expect(h.bot.fault?.code).toBe('budget');
    expect(h.faults).toHaveBeenCalledOnce();expect(h.apply).not.toHaveBeenCalled();h.bot.dispose();
  });
});
