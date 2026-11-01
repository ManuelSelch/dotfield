import type {
  ActionNodeDefinition,
  AnyChildNodeDefinition,
  RootNodeDefinition,
} from 'mistreevous/dist/BehaviourTreeDefinition';
import { describe, expect, it } from 'vitest';

import { compileProject } from './compiler';
import { createDefaultProject } from './default-project';
import { callGraphProject } from './fixtures/call-graph-project';
import { forwardingProject } from './fixtures/forwarding-project';
import { loadProject } from './project';
import { scopedSlot } from './tactics';
import type { BlockState, BotProject } from './types';

function all(project: BotProject) {
  const result: BlockState[] = [];
  function visit(b: BlockState) {
    result.push(b);
    Object.values(b.inputs ?? {}).forEach((c) => {
      if (c.block) visit(c.block);
      if (c.shadow) visit(c.shadow);
    });
    if (b.next?.block) visit(b.next.block);
  }
  project.tabs.forEach((t) => t.workspace.blocks.blocks.forEach(visit));
  return result;
}
const find = (p: BotProject, id: string) => all(p).find((b) => b.id === id)!;
function actions(root: RootNodeDefinition): ActionNodeDefinition[] {
  const result: ActionNodeDefinition[] = [];
  function visit(node: AnyChildNodeDefinition | RootNodeDefinition) {
    if (node.type === 'action') result.push(node);
    if ('child' in node) visit(node.child);
    if ('children' in node) node.children.forEach(visit);
  }
  visit(root);
  return result;
}
function errors(project: BotProject) {
  const r = compileProject(project);
  expect(r.ok).toBe(false);
  return r.ok ? [] : r.diagnostics;
}

describe('bounded parameterized tactic compilation', () => {
  it('binds scalar literals/forwarding and isolates every call path, including nested calls', () => {
    const r = compileProject(forwardingProject());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const queries = actions(r.program.definition).filter((a) => a.call === 'SelectCity');
    expect(queries.map((a) => a.args![0])).toEqual(['neutral', 'enemy']);
    expect(queries[0].args![2]).not.toBe(queries[1].args![2]);
    expect(Object.values(r.program.origins)).toContainEqual({
      tabId: 'capture',
      blockId: 'select-target',
      callPath: ['neutral-call', 'forwarded-call'],
    });
    expect(actions(r.program.definition).find((a) => a.call === 'PlanCapture')!.args![2]).toBe(
      15000,
    );
  });
  it('does not rename scalar enums which happen to equal local slot identities', () => {
    const p = createDefaultProject(),
      tab = p.tabs[1];
    tab.slots.find((s) => s.id === 'target')!.id = 'neutral';
    all(p).forEach((b) => {
      for (const key of Object.keys(b.fields ?? {}))
        if (['TARGET'].includes(key) && b.fields![key] === 'target') b.fields![key] = 'neutral';
    });
    const r = compileProject(p);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const query = actions(r.program.definition).find((a) => a.call === 'SelectCity')!;
    expect(query.args![0]).toBe('neutral');
    expect(query.args![2]).not.toBe('neutral');
  });
  it.each([
    [
      'missing-argument',
      (p: BotProject) => {
        delete find(p, 'neutral-call').inputs!.ARG_kind;
      },
    ],
    [
      'argument-signature',
      (p: BotProject) => {
        p.procedures[0].parameters[0].types = ['army'];
      },
    ],
    [
      'extra-argument',
      (p: BotProject) => {
        p.procedures[0].parameters = [];
      },
    ],
    [
      'parameter-reference',
      (p: BotProject) => {
        find(p, 'kind-reference').extraState.parameterId = 'missing';
      },
    ],
    [
      'parameter-type',
      (p: BotProject) => {
        p.procedures[0].parameters[0].types = ['army'];
        find(p, 'neutral-call').extraState.arguments = [{ parameterId: 'kind', type: 'army' }];
        find(p, 'neutral-call').inputs = {
          ARG_kind: { shadow: { id: 'army-arg', type: 'df_army', fields: { VALUE: 6 } } },
        };
      },
    ],
  ] as const)('rejects %s without replacing values or binding by display name', (code, change) => {
    const p = createDefaultProject();
    change(p);
    expect(errors(p)).toContainEqual(expect.objectContaining({ code }));
  });
  it('binds ranking and bounded army/horizon parameters by identity at each call', () => {
    const p = createDefaultProject();
    const parameters = [
      { id: 'minimum', name: 'minimum', types: ['army'] as ['army'] },
      { id: 'ranking', name: 'ranking', types: ['ranking'] as ['ranking'] },
      { id: 'duration', name: 'duration', types: ['horizon'] as ['horizon'] },
    ];
    p.procedures[0].parameters.push(...parameters);
    for (const [index, id] of ['neutral-call', 'enemy-call'].entries()) {
      const call = find(p, id);
      for (const parameter of parameters) {
        call.extraState.arguments.push({ parameterId: parameter.id, type: parameter.types[0] });
        const value =
          parameter.id === 'minimum'
            ? 7 + index
            : parameter.id === 'duration'
              ? 12000 + index * 1000
              : 'nearest-reachable';
        call.inputs![`ARG_${parameter.id}`] = {
          shadow: {
            id: `${id}-${parameter.id}`,
            type: `df_${parameter.types[0]}`,
            fields: { VALUE: value },
          },
        };
      }
    }
    for (const [id, input, parameter] of [
      ['select-sources', 'MINIMUM', parameters[0]],
      ['select-target', 'RANKING', parameters[1]],
      ['forecast', 'HORIZON', parameters[2]],
    ] as const)
      find(p, id).inputs![input] = {
        block: {
          id: `${parameter.id}-reference`,
          type: 'df_parameter',
          extraState: { parameterId: parameter.id, type: parameter.types[0] },
        },
      };

    const result = compileProject(p);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const list = actions(result.program.definition);
    expect(list.filter((a) => a.call === 'SelectSources').map((a) => a.args![1])).toEqual([7, 8]);
    expect(list.filter((a) => a.call === 'PlanCapture').map((a) => a.args![2])).toEqual([
      12000, 13000,
    ]);
    expect(list.filter((a) => a.call === 'SelectCity').map((a) => a.args![1])).toEqual([
      'nearest-reachable',
      'nearest-reachable',
    ]);
  });
  it('rejects missing tactic definitions rather than resolving a call by a matching display name', () => {
    const p = createDefaultProject();
    p.procedures[0].id = 'renamed-id';
    p.tabs[1].id = 'renamed-id';
    find(p, 'capture-entry').extraState.tacticId = 'renamed-id';
    expect(errors(p)).toContainEqual(
      expect.objectContaining({ code: 'format', blockId: 'neutral-call' }),
    );
  });
  it('rejects direct and indirect recursion, even in uncalled definitions', () => {
    const direct = createDefaultProject();
    find(direct, 'capture-body').inputs!.BODY = {
      block: structuredClone(find(direct, 'neutral-call')),
    };
    find(direct, 'capture-body').inputs!.BODY.block!.id = 'recursive-call';
    delete find(direct, 'capture-body').inputs!.BODY.block!.next;
    find(direct, 'capture-body').inputs!.BODY.block!.inputs!.ARG_kind.shadow!.id = 'recursive-arg';
    expect(errors(direct)).toContainEqual(
      expect.objectContaining({ code: 'recursion', blockId: 'recursive-call' }),
    );
    const indirect = forwardingProject();
    find(indirect, 'capture-body').inputs!.BODY = {
      block: {
        id: 'back-call',
        type: 'df_call',
        extraState: {
          tacticId: 'wrapper',
          arguments: [
            { parameterId: 'target-kind', type: 'query' },
            { parameterId: 'budget', type: 'attempts' },
          ],
        },
        inputs: {
          'ARG_target-kind': {
            shadow: { id: 'back-kind', type: 'df_query', fields: { VALUE: 'neutral' } },
          },
          ARG_budget: { shadow: { id: 'back-budget', type: 'df_attempts', fields: { VALUE: 1 } } },
        },
      },
    };
    expect(errors(indirect).some((d) => d.code === 'recursion')).toBe(true);
  });
  it('keeps identities and compilation stable through renames and repeated compilation', () => {
    const p = createDefaultProject(),
      before = compileProject(p);
    expect(before.ok).toBe(true);
    p.procedures[0].name = 'Take';
    p.procedures[0].parameters[0].name = 'which';
    const after = compileProject(p);
    expect(after).toEqual(before);
    expect(compileProject(p)).toEqual(after);
  });
  it('rejects excessive expansion before materialization, even without recursion or excessive call depth', () => {
    const p = callGraphProject(4, 6),
      before = JSON.stringify(p);
    const diagnostics = errors(p);
    expect(diagnostics.some((d) => d.code === 'size')).toBe(true);
    expect(diagnostics.some((d) => d.code === 'recursion' || d.code === 'call-depth')).toBe(false);
    expect(JSON.stringify(p)).toBe(before);
  });
  it('bounds call depth separately from expanded native tree depth', () => {
    expect(errors(callGraphProject(5, 1))).toContainEqual(
      expect.objectContaining({ code: 'call-depth' }),
    );
    expect(errors(callGraphProject(4, 1, 3))).toContainEqual(
      expect.objectContaining({ code: 'depth' }),
    );
    const allowed = compileProject(callGraphProject(4, 4));
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(actions(allowed.program.definition)).toHaveLength(64);
  });
  it('binds cleanup to precisely the same private plan used by the corresponding actions', () => {
    const r = compileProject(createDefaultProject());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const selector = r.program.definition.child;
    if (selector.type !== 'selector') throw new Error('selector');
    const plans = selector.children.map((seq) => {
      if (seq.type !== 'sequence') throw new Error('sequence');
      const execute = seq.children.find(
        (a) => a.type === 'action' && a.call === 'ExecutePlan',
      ) as ActionNodeDefinition;
      expect(seq.exit!.args![0]).toBe(execute.args![0]);
      return execute.args![0];
    });
    expect(new Set(plans).size).toBe(2);
    expect(plans).toEqual([
      scopedSlot(['neutral-call'], 'plan'),
      scopedSlot(['enemy-call'], 'plan'),
    ]);
    expect(scopedSlot(['a/b', 'c'], 'd')).not.toBe(scopedSlot(['a', 'b/c'], 'd'));
    expect(scopedSlot([], String(plans[0]))).not.toBe(plans[0]);
  });
  it('checks forwarded numeric domains at the supplying call, not only at primitive use', () => {
    const p = createDefaultProject();
    p.procedures[0].parameters.push({ id: 'h', name: 'horizon', types: ['horizon'] });
    for (const id of ['neutral-call', 'enemy-call']) {
      const call = find(p, id);
      call.extraState.arguments.push({ parameterId: 'h', type: 'horizon' });
      call.inputs!.ARG_h = {
        shadow: {
          id: `${id}-h`,
          type: 'df_horizon',
          fields: { VALUE: id === 'neutral-call' ? 60000 : 15000 },
        },
      };
    }
    find(p, 'forecast').inputs!.HORIZON = {
      block: {
        id: 'h-reference',
        type: 'df_parameter',
        extraState: { parameterId: 'h', type: 'horizon' },
      },
    };
    expect(errors(p)).toContainEqual(
      expect.objectContaining({ code: 'argument-value', blockId: 'neutral-call', input: 'ARG_h' }),
    );
  });
  it('preserves binding through real workspace/model rename and serialization', () => {
    const session = loadProject(forwardingProject());
    try {
      const before = compileProject(session.save());
      expect(before.ok).toBe(true);
      session.models.get('capture')!.setName('Take');
      session.models.get('wrapper')!.getParameter(0).setName('class');
      const copy = loadProject(session.save());
      try {
        expect(compileProject(copy.save())).toEqual(before);
      } finally {
        copy.dispose();
      }
    } finally {
      session.dispose();
    }
  });
  it('updates both expanded bodies after a shared definition edit, never an older snapshot', () => {
    const p = createDefaultProject(),
      first = compileProject(p);
    find(p, 'minimum-army').fields!.VALUE = 20;
    const second = compileProject(p);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(
      actions(first.program.definition)
        .filter((a) => a.call === 'SelectSources')
        .map((a) => a.args![1]),
    ).toEqual([6, 6]);
    expect(
      actions(second.program.definition)
        .filter((a) => a.call === 'SelectSources')
        .map((a) => a.args![1]),
    ).toEqual([20, 20]);
  });
});
