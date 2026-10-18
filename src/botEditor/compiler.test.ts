import { describe, expect, it } from 'vitest';
import { BehaviourTree, convertMDSLToJSON } from 'mistreevous';
import expansion from '../game/ai/mdsl/expansion.mdsl?raw';
import type { BlockState } from './types';
import { compileProject } from './compiler';
import { directProject } from './fixtures/directProject';
import { createDefaultProject } from './defaultProject';
import { scopedSlot } from './tactics';

describe('direct Blockly → native Mistreevous compiler', () => {
  it('compiles native nodes, authored order/arguments and exit cleanup with block origins', () => {
    const result = compileProject(directProject());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => new BehaviourTree(result.program.definition, {})).not.toThrow();
    expect(result.program.definition.child.type).toBe('selector');
    expect(result.program.origins['0.0.0']).toEqual({ tabId: 'main', blockId: 'n-capture-body', callPath: [] });
    expect(JSON.stringify(result.program.definition)).toContain('ReleasePlan');
    expect(JSON.stringify(result.program.definition)).not.toContain('df_');
  });
  it('matches the existing capture tree JSON exactly, apart from deliberate private slot labels', async () => {
    const result = compileProject(directProject());expect(result.ok).toBe(true);
    if (!result.ok) return;
    const replacements: Record<string, string> = { target: 'n-target', sources: 'n-sources', source: 'n-source', chosen: 'n-chosen', capturePlan: 'n-plan',
      attackTarget: 'e-target', attackSources: 'e-sources', attackSource: 'e-source', attackChosen: 'e-chosen', attackPlan: 'e-plan' };
    const baseline = JSON.parse(JSON.stringify(convertMDSLToJSON(expansion)[0]), (_key, value) => typeof value === 'string' && replacements[value] ? scopedSlot([], replacements[value]) : value);
    expect(result.program.definition).toEqual(baseline);
    await expect(JSON.stringify(result.program, null, 2) + '\n').toMatchFileSnapshot('./fixtures/direct-program.json');
  });
  it.each([
    ['missing-input', 'n-forecast', (b: BlockState) => { delete b.inputs!.HORIZON; }],
    ['argument-value', 'n-forecast', (b: BlockState) => { b.inputs!.HORIZON.shadow!.fields!.VALUE = 60000; }],
    ['format', 'n-forecast', (b: BlockState) => { b.fields!.SOURCES = 'n-sources'; }],
    ['missing-input', 'n-capture-body', (b: BlockState) => { delete b.inputs!.BODY; }],
  ] as const)('links %s diagnostics to the authored block', (code, id, change) => {
    const project = directProject();
    function visit(b: BlockState) {
      if (b.id === id) change(b);
      for (const c of Object.values(b.inputs ?? {})) { if (c.block) visit(c.block); if (c.shadow) visit(c.shadow); }
      if (b.next?.block) visit(b.next.block);
    }
    project.tabs[0].workspace.blocks.blocks.forEach(visit);
    const result = compileProject(project);expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics).toContainEqual(expect.objectContaining({ code, blockId: id, tabId: 'main' }));
  });
  it('rejects detached drafts, including otherwise supported scalar blocks', () => {
    const project = directProject();
    project.tabs[0].workspace.blocks.blocks.push({ type: 'df_army', id: 'draft', fields: { VALUE: 20 } });
    const result = compileProject(project);expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'dangling', blockId: 'draft' }));
  });
  it('reports certain reads before initialization without treating selection failure as invalid policy', () => {
    const project = directProject();
    const sequence = project.tabs[0].workspace.blocks.blocks[0].inputs!.BODY.block!.inputs!.BODY.block!;
    sequence.inputs!.BODY = { block: sequence.inputs!.BODY.block!.next!.block! };
    const result = compileProject(project);expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'read-before-write', blockId: 'n-select-sources' }));
  });
  it('compiles the shared Capture definition with distinct bound neutral/enemy calls', async () => {
    const result = compileProject(createDefaultProject());expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.program.origins['0.0.0']).toEqual({ tabId: 'capture', blockId: 'capture-body', callPath: ['neutral-call'] });
    expect(result.program.origins['0.0.1']).toEqual({ tabId: 'capture', blockId: 'capture-body', callPath: ['enemy-call'] });
    await expect(JSON.stringify(result.program, null, 2) + '\n').toMatchFileSnapshot('./fixtures/tactic-program.json');
  });
});
