import { PROGRAM_LIMITS as L } from '@/game/ai/program/limits';

import { CATALOG, SCALARS } from './catalog';
import type { CompilerDiagnostic } from './compiler';
import type { BlockState, BotProject, CallState, ScalarType } from './types';

export const child = (b: BlockState, input: string) =>
  b.inputs?.[input]?.block ?? b.inputs?.[input]?.shadow;
export const siblings = (first?: BlockState): BlockState[] => {
  const result: BlockState[] = [];
  for (let b = first; b; b = b.next?.block) result.push(b);
  return result;
};
/** Length framing is injective even when authored IDs contain ':' or '/'.
 * Main's namespace is disjoint from every call namespace. No tick/counter IDs.
 */
export function scopedSlot(callPath: string[], slot: string): string {
  const frame = (id: string) => `${id.length}:${id}`;
  return `${callPath.length ? 'c/' + callPath.map(frame).join('') : 'm/'}${frame(slot)}`;
}
interface Stats {
  nodes: number;
  depth: number;
  calls: number;
}

/** Check signatures, references and the entire DAG (including uncalled tactics)
 * before any parameter substitution or expanded runtime node allocation.
 */
export function analyzeTactics(project: BotProject): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const procedures = new Map(project.procedures.map((p) => [p.id, p]));
  const roots = new Map(
    project.tabs.map((t) => [
      t.id,
      t.workspace.blocks.blocks.find((b) => ['df_main', 'df_tactic'].includes(b.type))!,
    ]),
  );
  const edges = new Map<string, { target: string; block: BlockState }[]>();
  for (const tab of project.tabs) {
    const parameters = procedures.get(tab.id)?.parameters ?? [];
    const calls: { target: string; block: BlockState }[] = [];
    edges.set(tab.id, calls);
    const report = (b: BlockState, code: string, message: string, input?: string) => {
      if (
        !diagnostics.some(
          (d) => d.tabId === tab.id && d.blockId === b.id && d.code === code && d.input === input,
        )
      )
        diagnostics.push({
          tabId: tab.id,
          blockId: b.id,
          code,
          message,
          ...(input ? { input } : {}),
        });
    };
    function scalar(b: BlockState, expected: ScalarType, owner: BlockState, input: string) {
      if (b.type === 'df_parameter') {
        const parameter = parameters.find((p) => p.id === b.extraState.parameterId);
        if (!parameter)
          report(
            b,
            'parameter-reference',
            'Parameter identity is missing from this definition scope.',
          );
        else if (parameter.types[0] !== b.extraState.type || parameter.types[0] !== expected)
          report(
            b,
            'parameter-type',
            'Forwarded parameter type is incompatible; its identity/value was not replaced.',
          );
        return;
      }
      if (b.type !== `df_${expected}`) {
        report(
          owner,
          'argument-signature',
          'Argument type does not match the declared input.',
          input,
        );
        return;
      }
      const domain = SCALARS[expected],
        value = b.fields!.VALUE;
      if (
        domain.values
          ? !domain.values.includes(value)
          : !Number.isInteger(value) ||
            value < domain.min! ||
            value > (expected === 'horizon' ? L.horizonMs : domain.max!)
      )
        report(
          owner,
          'argument-value',
          expected === 'horizon'
            ? `Forecast admission is 1–${L.horizonMs} ms; source was not changed.`
            : 'Scalar value is outside the admitted domain.',
          input,
        );
    }
    function check(b: BlockState) {
      const spec = CATALOG[b.type];
      const inputs =
        spec?.inputs ??
        (['df_main', 'df_tactic'].includes(b.type) ? { BODY: 'body' as const } : {});
      for (const [input, type] of Object.entries(inputs)) {
        const value = child(b, input);
        if (!value)
          report(
            b,
            'missing-input',
            type === 'body' ? 'Executable groups cannot be empty.' : `Provide ${input}.`,
            input,
          );
        else if (type !== 'body') scalar(value, type, b, input);
      }
      if (b.type === 'df_call') {
        const state = b.extraState as CallState,
          callee = procedures.get(state.tacticId)!;
        calls.push({ target: callee.id, block: b });
        for (const arg of state.arguments) {
          const parameter = callee.parameters.find((p) => p.id === arg.parameterId);
          if (!parameter)
            report(b, 'extra-argument', 'Call retains an argument for a removed parameter.');
          else if (parameter.types[0] !== arg.type)
            report(
              b,
              'argument-signature',
              'Call signature changed. Resolve the incompatible argument explicitly.',
            );
        }
        for (const parameter of callee.parameters) {
          const input = `ARG_${parameter.id}`,
            value = child(b, input);
          if (!state.arguments.some((a) => a.parameterId === parameter.id) || !value)
            report(b, 'missing-argument', `Supply ${parameter.name}.`, input);
          else scalar(value, parameter.types[0], b, input);
        }
      }
      // Check a reference even if it belongs to an obsolete call input.
      if (b.type === 'df_parameter' && !parameters.some((p) => p.id === b.extraState.parameterId))
        report(
          b,
          'parameter-reference',
          'Parameter identity is missing from this definition scope.',
        );
      for (const c of Object.values(b.inputs ?? {})) {
        if (c.block) check(c.block);
        if (c.shadow) check(c.shadow);
      }
      if (b.next?.block) check(b.next.block);
    }
    for (const b of tab.workspace.blocks.blocks) {
      if (!['df_main', 'df_tactic'].includes(b.type))
        report(
          b,
          'dangling',
          'Detached draft blocks must be removed or connected before compiling.',
        );
      check(b);
    }
  }
  const colors = new Map<string, number>();
  function cycle(id: string) {
    colors.set(id, 1);
    for (const edge of edges.get(id) ?? [])
      if (colors.get(edge.target) === 1)
        diagnostics.push({
          tabId: id,
          blockId: edge.block.id,
          code: 'recursion',
          message: 'Direct/indirect recursive tactic calls cannot compile.',
        });
      else if (!colors.has(edge.target)) cycle(edge.target);

    colors.set(id, 2);
  }
  for (const tab of project.tabs) if (!colors.has(tab.id)) cycle(tab.id);
  if (diagnostics.length) return diagnostics;

  const memo = new Map<string, Stats>();
  // Saturate counts: a compact acyclic DAG must never cause exponential work
  // or integer overflow merely to find out that its expansion is too large.
  const cap = (n: number) => Math.min(n, L.nodes + 1);
  function combine(parts: Stats[], wrapper: boolean): Stats {
    return {
      nodes: cap(parts.reduce((n, p) => cap(n + p.nodes), wrapper ? 1 : 0)),
      depth: (wrapper ? 1 : 0) + Math.max(0, ...parts.map((p) => p.depth)),
      calls: Math.max(0, ...parts.map((p) => p.calls)),
    };
  }
  function stack(first: BlockState | undefined, single: boolean): Stats {
    const list = siblings(first);
    return combine(list.map(node), single && list.length > 1);
  }
  function body(id: string): Stats {
    if (!memo.has(id)) memo.set(id, stack(child(roots.get(id)!, 'BODY'), true));
    return memo.get(id)!;
  }
  function node(b: BlockState): Stats {
    if (b.type === 'df_call') {
      const target = body(b.extraState.tacticId);
      return { ...target, calls: 1 + target.calls };
    }
    if (b.type === 'df_selector' || b.type === 'df_sequence')
      return combine(siblings(child(b, 'BODY')).map(node), true);
    if (b.type === 'df_retry') return combine([stack(child(b, 'BODY'), true)], true);
    return { nodes: 1, depth: 0, calls: 0 };
  }
  for (const tab of project.tabs) {
    const stats = body(tab.id),
      root = roots.get(tab.id)!;
    if (stats.nodes + 1 > L.nodes)
      diagnostics.push({
        tabId: tab.id,
        blockId: root.id,
        code: 'size',
        message: 'Expanded runtime node limit exceeded before materialization.',
      });
    if (stats.depth + 1 > L.depth)
      diagnostics.push({
        tabId: tab.id,
        blockId: root.id,
        code: 'depth',
        message: 'Expanded runtime depth limit exceeded before materialization.',
      });
    if (stats.calls > L.callDepth)
      diagnostics.push({
        tabId: tab.id,
        blockId: root.id,
        code: 'call-depth',
        message: 'Tactic call-depth limit exceeded before materialization.',
      });
  }
  return diagnostics;
}
