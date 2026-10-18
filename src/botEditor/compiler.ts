import type { AnyChildNodeDefinition, RootNodeDefinition } from 'mistreevous/dist/BehaviourTreeDefinition';
import { PROGRAM_LIMITS } from '../game/ai/program/limits';
import type { CompiledProgram, NodeOrigin } from '../game/ai/program/definition';
import { validateProgramDefinition } from '../game/ai/program/validation';
import { CATALOG } from './catalog';
import { cloneProject, ProjectFormatError } from './format';
import type { BlockState, BotProject } from './types';

export interface CompilerDiagnostic { code: string; message: string; blockId?: string; tabId?: string; input?: string }
export type CompileResult = { ok: true; program: CompiledProgram } | { ok: false; diagnostics: CompilerDiagnostic[] };
const child = (b: BlockState, input: string) => b.inputs?.[input]?.block ?? b.inputs?.[input]?.shadow;
const siblings = (first?: BlockState): BlockState[] => {
  const result: BlockState[] = [];
  for (let b = first; b; b = b.next?.block) result.push(b);
  return result;
};
/** Direct trees only in slice 3. No Blockly initialization, text parser, eval or general AST. */
export function compileProject(input: unknown): CompileResult {
  let project: BotProject;
  try { project = cloneProject(input); }
  catch (error) {
    return { ok: false, diagnostics: [{ code: 'format', message: error instanceof Error ? error.message : 'Invalid source.',
      ...(error instanceof ProjectFormatError ? { blockId: error.blockId, tabId: error.tabId } : {}) }] };
  }
  const diagnostics: CompilerDiagnostic[] = [];
  let total = 0;
  for (const tab of project.tabs) {
    const report = (b: BlockState, code: string, message: string, input?: string) => diagnostics.push({ tabId: tab.id, blockId: b.id, code, message, ...(input ? { input } : {}) });
    const roots = tab.workspace.blocks.blocks;
    for (const block of roots) if (!['df_main', 'df_tactic'].includes(block.type)) report(block, 'dangling', 'Detached draft blocks must be removed or connected before compiling.');
    function check(b: BlockState) {
      if (b.type === 'df_call') report(b, 'call-not-supported', 'Reusable call expansion is not implemented until slice 4.');
      if (b.type === 'df_parameter') report(b, 'parameter-not-supported', 'Parameter binding is not implemented until slice 4.');
      const spec = CATALOG[b.type];
      const required = spec?.inputs ?? (['df_main', 'df_tactic'].includes(b.type) ? { BODY: 'body' } : {});
      for (const [input, type] of Object.entries(required)) {
        if (!child(b, input)) report(b, 'missing-input', type === 'body' ? 'Executable groups cannot be empty.' : `Provide ${input}.`, input);
      }
      for (const c of Object.values(b.inputs ?? {})) { if (c.block) check(c.block); if (c.shadow) check(c.shadow); }
      if (b.next?.block) check(b.next.block);
    }
    roots.forEach(check);
    // Count executable nodes, including implicit root/retry sequence wrappers,
    // before allocating even the direct runtime representation.
    function countStack(first: BlockState | undefined, single: boolean): number {
      const list = siblings(first);
      return (single && list.length > 1 ? 1 : 0) + list.reduce((n, b) => n + 1 + (child(b, 'BODY') ? countStack(child(b, 'BODY'), b.type === 'df_retry') : 0), 0);
    }
    const root = roots.find(b => b.type === 'df_main' || b.type === 'df_tactic')!;
    total += 1 + countStack(child(root, 'BODY'), true);
    if (total > PROGRAM_LIMITS.nodes) report(root, 'size', 'Runtime node limit exceeded before materialization.');
  }
  if (diagnostics.length) return { ok: false, diagnostics };
  let main: CompiledProgram | undefined;
  for (const tab of project.tabs) {
    const origins: Record<string, NodeOrigin> = {};
    function origin(path: string, b: BlockState) { origins[path] = { tabId: tab.id, blockId: b.id!, callPath: [] }; }
    function stack(first: BlockState, path: string, owner: BlockState): AnyChildNodeDefinition {
      const list = siblings(first);
      if (list.length === 1) return emit(list[0], path);
      origin(path, owner);
      return { type: 'sequence', children: list.map((b, i) => emit(b, `${path}.${i}`)) };
    }
    function emit(b: BlockState, path: string): AnyChildNodeDefinition {
      origin(path, b);
      const body = child(b, 'BODY');
      const f = (name: string): string => b.fields![name];
      const v = (name: string): string | number => child(b, name)!.fields!.VALUE;
      if (b.type === 'df_selector' || b.type === 'df_sequence') {
        const node = { type: b.type === 'df_selector' ? 'selector' as const : 'sequence' as const,
          children: siblings(body).map((step, i) => emit(step, `${path}.${i}`)) };
        return b.type === 'df_sequence' && f('CLEANUP') === 'release-plan' ? { ...node, exit: { call: 'ReleasePlan', args: [f('PLAN')] } } : node;
      }
      if (b.type === 'df_retry') return { type: 'retry', attempts: v('ATTEMPTS') as number, child: stack(body!, `${path}.0`, b) };
      let call: string, args: (string | number)[];
      switch (b.type) {
        case 'df_select_city': call = 'SelectCity'; args = [v('QUERY'), v('RANKING'), f('TARGET')]; break;
        case 'df_select_sources': call = 'SelectSources'; args = [f('TARGET'), v('MINIMUM'), f('OUTPUT')]; break;
        case 'df_next_city': call = 'NextCity'; args = [f('LIST'), f('OUTPUT')]; break;
        case 'df_clear_set': call = 'ClearSet'; args = [f('SET')]; break;
        case 'df_add_to_set': call = 'AddToSet'; args = [f('SET'), f('CITY')]; break;
        case 'df_plan_capture': call = 'PlanCapture'; args = [f('TARGET'), f('SOURCES'), v('HORIZON'), f('PLAN')]; break;
        case 'df_execute_plan': call = 'ExecutePlan'; args = [f('PLAN')]; break;
        default: throw new Error('Unreachable admitted block.');
      }
      return { type: 'action', call, args };
    }
    const root = tab.workspace.blocks.blocks.find(b => ['df_main', 'df_tactic'].includes(b.type))!;
    origin('0', root);
    const definition: RootNodeDefinition = { type: 'root', child: stack(child(root, 'BODY')!, '0.0', root) };
    const checked = validateProgramDefinition(definition);
    if (!checked.ok) diagnostics.push(...checked.diagnostics.map(d => ({ code: d.code, message: d.message, ...origins[d.path] })));
    else if (tab.id === 'main') main = { definition: checked.definition, origins };
  }
  return diagnostics.length ? { ok: false, diagnostics } : { ok: true, program: main! };
}
