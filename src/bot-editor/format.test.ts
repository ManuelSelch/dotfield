import { describe, expect, it } from 'vitest';

import { createDefaultProject } from './default-project';
import { loadProject, parseProject } from './project';
import { SOURCE_LIMITS } from './types';
import type { BlockState, BotProject } from './types';

function blocks(project: BotProject): BlockState[] {
  const all: BlockState[] = [];
  function visit(b: BlockState) {
    all.push(b);
    for (const input of Object.values(b.inputs ?? {})) {
      if (input.block) visit(input.block);
      if (input.shadow) visit(input.shadow);
    }
    if (b.next?.block) visit(b.next.block);
  }
  project.tabs.forEach((t) => t.workspace.blocks.blocks.forEach(visit));
  return all;
}
const find = (p: BotProject, id: string) => blocks(p).find((b) => b.id === id)!;

describe('source admission before Blockly deserialization', () => {
  it.each([
    [
      'unknown format',
      (p: BotProject) => {
        Object.assign(p, { format: 'other' });
      },
    ],
    [
      'old procedures dependency',
      (p: BotProject) => {
        Object.assign(p, { proceduresVersion: '1' });
      },
    ],
    [
      'workspace language version',
      (p: BotProject) => {
        Object.assign(p.tabs[0].workspace.blocks, { languageVersion: 99 });
      },
    ],
    [
      'duplicate tactic',
      (p: BotProject) => {
        p.procedures.push(p.procedures[0]);
      },
    ],
    [
      'duplicate parameter',
      (p: BotProject) => {
        p.procedures[0].parameters.push(p.procedures[0].parameters[0]);
      },
    ],
    [
      'unsupported scalar parameter type',
      (p: BotProject) => {
        Object.assign(p.procedures[0].parameters[0], { types: ['city'] });
      },
    ],
    [
      'missing tab',
      (p: BotProject) => {
        p.tabs.pop();
      },
    ],
    [
      'unknown active tab',
      (p: BotProject) => {
        p.editor.activeTab = 'missing';
      },
    ],
    [
      'unsupported slot kind',
      (p: BotProject) => {
        Object.assign(p.tabs[1].slots[0], { kind: 'code' });
      },
    ],
    [
      'wrong primitive slot kind',
      (p: BotProject) => {
        find(p, 'forecast').fields!.SOURCES = 'sources';
      },
    ],
    [
      'unknown slot identity',
      (p: BotProject) => {
        find(p, 'forecast').fields!.PLAN = 'missing';
      },
    ],
    [
      'out-of-range number',
      (p: BotProject) => {
        find(p, 'source-limit').fields!.VALUE = 9;
      },
    ],
    [
      'fractional number',
      (p: BotProject) => {
        find(p, 'capture-horizon').fields!.VALUE = 0.5;
      },
    ],
    [
      'nonfinite number',
      (p: BotProject) => {
        find(p, 'capture-horizon').fields!.VALUE = Infinity;
      },
    ],
    [
      'unsupported enum',
      (p: BotProject) => {
        find(p, 'neutral-call-kind').fields!.VALUE = 'any';
      },
    ],
    [
      'unsupported field',
      (p: BotProject) => {
        find(p, 'forecast').fields!.method = 'arbitrary';
      },
    ],
    [
      'duplicate block identity',
      (p: BotProject) => {
        find(p, 'forecast').id = 'execute';
      },
    ],
    [
      'missing block identity',
      (p: BotProject) => {
        delete find(p, 'forecast').id;
      },
    ],
    [
      'unknown input',
      (p: BotProject) => {
        find(p, 'forecast').inputs!.UNKNOWN = find(p, 'forecast').inputs!.HORIZON;
      },
    ],
    [
      'wrong scalar connection',
      (p: BotProject) => {
        find(p, 'capture-horizon').type = 'df_army';
      },
    ],
    [
      'false child hidden beside a shadow',
      (p: BotProject) => {
        Object.assign(find(p, 'forecast').inputs!.HORIZON, { block: false });
      },
    ],
    [
      'null child hidden beside a shadow',
      (p: BotProject) => {
        Object.assign(find(p, 'forecast').inputs!.HORIZON, { block: null });
      },
    ],
    [
      'wrong statement connection',
      (p: BotProject) => {
        find(p, 'execute').type = 'df_main';
      },
    ],
    [
      'missing tactic reference',
      (p: BotProject) => {
        find(p, 'neutral-call').extraState.tacticId = 'missing';
      },
    ],
    [
      'misbound definition',
      (p: BotProject) => {
        find(p, 'capture-entry').extraState.tacticId = 'other';
      },
    ],
    [
      'hidden disabled source',
      (p: BotProject) => {
        find(p, 'forecast').enabled = false;
      },
    ],
    [
      'unrecognized serialized code',
      (p: BotProject) => {
        find(p, 'forecast').extraState = { code: 'alert(1)' };
      },
    ],
  ] as const)('rejects %s rather than silently repairing it', (_name, change) => {
    const project = createDefaultProject();
    change(project);
    expect(() => loadProject(project)).toThrow(/Bot project:/);
  });
  it('rejects cyclic object input and excessive bytes before workspace allocation', () => {
    const cycle: { loop?: unknown } = {};
    cycle.loop = cycle;
    expect(() => loadProject(cycle)).toThrow(/cyclic/);
    expect(() => parseProject(' '.repeat(SOURCE_LIMITS.bytes + 1))).toThrow(/byte limit/);
  });
  it('rejects excessive block count and nesting separately', () => {
    const many = createDefaultProject();
    many.tabs[0].workspace.blocks.blocks.push(
      ...Array.from({ length: SOURCE_LIMITS.blocks }, (_, i) => ({
        type: 'df_execute_plan',
        id: `extra-${i}`,
        fields: { PLAN: 'plan' },
      })),
    );
    expect(() => loadProject(many)).toThrow(/count/);
    const deep = createDefaultProject();
    let inner = find(deep, 'main-priority');
    for (let i = 0; i < SOURCE_LIMITS.depth + 1; i++) {
      const next: BlockState = { type: 'df_selector', id: `deep-${i}` };
      inner.inputs = { BODY: { block: next } };
      inner = next;
    }
    expect(() => loadProject(deep)).toThrow(/depth/);
  });
  it('accepts the authored block ceiling and rejects one extra block without truncation', () => {
    const project = createDefaultProject(),
      existing = blocks(project).length;
    for (let i = existing; i < SOURCE_LIMITS.blocks; i++)
      project.tabs[0].workspace.blocks.blocks.push({
        type: 'df_execute_plan',
        id: `boundary-${i}`,
        fields: { PLAN: 'plan' },
      });
    const session = loadProject(project);
    try {
      expect(blocks(session.save())).toHaveLength(SOURCE_LIMITS.blocks);
    } finally {
      session.dispose();
    }
    project.tabs[0].workspace.blocks.blocks.push({
      type: 'df_execute_plan',
      id: 'one-too-many',
      fields: { PLAN: 'plan' },
    });
    expect(() => loadProject(project)).toThrow(/count/);
  });
  it('bounds tactic, parameter and slot declaration counts', () => {
    const project = createDefaultProject();
    for (let i = 1; i < SOURCE_LIMITS.tactics; i++) {
      const id = `extra-${i}`;
      project.procedures.push({ id, name: id, returnTypes: null, parameters: [] });
      project.tabs.push({
        id,
        slots: [],
        workspace: {
          blocks: {
            languageVersion: 0,
            blocks: [{ type: 'df_tactic', id: `${id}-entry`, extraState: { tacticId: id } }],
          },
        },
      });
    }
    for (let i = 1; i < SOURCE_LIMITS.parameters; i++)
      project.procedures[0].parameters.push({ id: `p-${i}`, name: `p-${i}`, types: ['query'] });
    for (let i = project.tabs[0].slots.length; i < SOURCE_LIMITS.slots; i++)
      project.tabs[0].slots.push({ id: `s-${i}`, name: `s-${i}`, kind: 'city' });
    loadProject(project).dispose();
    const tacticOverflow = structuredClone(project);
    tacticOverflow.procedures.push({
      id: 'overflow',
      name: 'overflow',
      returnTypes: null,
      parameters: [],
    });
    expect(() => loadProject(tacticOverflow)).toThrow(/tactic.*count/);
    const parameterOverflow = structuredClone(project);
    parameterOverflow.procedures[0].parameters.push({
      id: 'overflow',
      name: 'overflow',
      types: ['army'],
    });
    expect(() => loadProject(parameterOverflow)).toThrow(/parameter.*count/);
    const slotOverflow = structuredClone(project);
    slotOverflow.tabs[0].slots.push({ id: 'overflow', name: 'overflow', kind: 'city' });
    expect(() => loadProject(slotOverflow)).toThrow(/slot.*count/);
  });
  it('measures byte limits as UTF-8, not JavaScript string length', () => {
    const text = JSON.stringify({ padding: 'é'.repeat(SOURCE_LIMITS.bytes / 2) });
    expect(text.length).toBeLessThan(SOURCE_LIMITS.bytes);
    expect(() => parseProject(text)).toThrow(/byte limit/);
  });
  it('keeps incomplete and obsolete arguments as visible drafts, not activation-ready programs', () => {
    const project = createDefaultProject();
    delete find(project, 'forecast').inputs;
    project.procedures[0].parameters = [];
    const session = loadProject(project);
    try {
      expect(
        session.workspaces.get('capture')!.getBlockById('forecast')!.getInputTargetBlock('HORIZON'),
      ).toBeNull();
      expect(
        session.workspaces
          .get('main')!
          .getBlockById('neutral-call')!
          .getInputTargetBlock('ARG_kind')!
          .getFieldValue('VALUE'),
      ).toBe('neutral');
    } finally {
      session.dispose();
    }
  });
});
