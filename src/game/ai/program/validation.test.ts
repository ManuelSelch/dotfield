import { describe, expect, it } from 'vitest';
import type { AnyChildNodeDefinition, RootNodeDefinition } from 'mistreevous/dist/BehaviourTreeDefinition';
import { validateProgramDefinition } from './validation';
import { PROGRAM_LIMITS } from './limits';
const root = (child: AnyChildNodeDefinition): RootNodeDefinition => ({ type: 'root', child });
const select = { type: 'action' as const, call: 'SelectCity', args: ['neutral', 'nearest-reachable', 'target'] };
const sources = { type: 'action' as const, call: 'SelectSources', args: ['target', 6, 'sources'] };
const problems = (value: unknown) => { const r = validateProgramDefinition(value);expect(r.ok).toBe(false);return r.ok ? [] : r.diagnostics.map(d => d.code); };

describe('native program admission', () => {
  it('clones and freezes admitted JSON, without Blockly or mutable source references', () => {
    const input = root(select), result = validateProgramDefinition(input);expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.definition.child)).toBe(true);
    expect(result.definition).not.toBe(input);
    expect(() => { result.definition.child.type = 'action'; }).toThrow();
  });
  it.each(['constructor', 'clear', 'ReleasePlan', 'toString', 'SelectAnything'])('rejects arbitrary action method %s', call => {
    expect(problems(root({ type: 'action', call, args: [] }))).toContain('method');
  });
  it.each(['while', 'until', 'entry', 'step', 'id'])('rejects unapproved native attribute %s', key => {
    expect(problems({ ...root(select), [key]: { call: 'SelectCity' } })).toContain('attribute');
  });
  it.each([
    { type: 'retry', child: select },
    { type: 'retry', attempts: Infinity, child: select },
    { type: 'retry', attempts: [1, 8], child: select },
    { type: 'retry', attempts: 9, child: select },
    { type: 'retry', attempts: 0, child: select },
  ])('rejects unbounded/random/invalid retry counts', child => { expect(problems({ type: 'root', child })).toContain('number'); });
  it('rejects unknown nodes, empty groups, callbacks, native branch refs and argument expressions', () => {
    expect(problems({ type: 'root', child: { type: 'branch', ref: 'global' } })).toContain('node-type');
    expect(problems(root({ type: 'sequence', children: [] }))).toContain('empty');
    expect(problems(root({ type: 'sequence', children: [select], exit: { call: 'clear' } }))).toContain('callback');
    expect(problems(root({ ...select, args: [{ $: 'user.value' }, 'nearest-reachable', 'target'] }))).toContain('argument-value');
  });
  it('tracks definite writes across sequences, selector failure paths and cleanup', () => {
    expect(validateProgramDefinition(root({ type: 'sequence', children: [select, sources] })).ok).toBe(true);
    expect(problems(root({ type: 'sequence', children: [sources, select] }))).toContain('read-before-write');
    expect(problems(root({ type: 'sequence', children: [
      { type: 'selector', children: [select, { type: 'action', call: 'ClearSet', args: ['chosen'] }] }, sources,
    ] }))).toContain('read-before-write');
    expect(problems(root({ type: 'sequence', children: [select, { type: 'action', call: 'ClearSet', args: ['target'] }] }))).toContain('slot-kind');
  });
  it('checks subsequent retry attempts after a failed action clears a previously initialized slot', () => {
    const input = root({ type: 'sequence', children: [select, { type: 'retry', attempts: 2, child: {
      type: 'sequence', children: [sources, select],
    } }] });
    // First attempt can lose target through SelectCity failure; a second attempt
    // cannot assume the original target still exists.
    expect(problems(input)).toContain('read-before-write');
  });
  it('bounds bytes, native nodes and depth without trusting generated or persisted JSON', () => {
    expect(problems('x'.repeat(PROGRAM_LIMITS.bytes + 1))).toContain('format');
    expect(problems(root({ type: 'sequence', children: Array.from({ length: PROGRAM_LIMITS.nodes }, () => select) }))).toContain('size');
    let child: AnyChildNodeDefinition = select;
    for (let i = 0; i < PROGRAM_LIMITS.depth; i++) child = { type: 'retry', attempts: 1, child };
    expect(problems(root(child))).toContain('size');
  });
});
