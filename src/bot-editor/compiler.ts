import type {
  AnyChildNodeDefinition,
  RootNodeDefinition,
} from 'mistreevous/dist/BehaviourTreeDefinition';

import type { CompiledProgram, NodeOrigin } from '@/game/ai/program/definition';
import { validateProgramDefinition } from '@/game/ai/program/validation';

import { SCALARS } from './catalog';
import { cloneProject, ProjectFormatError } from './format';
import { analyzeTactics, child, scopedSlot, siblings } from './tactics';
import type { BlockState, BotProject } from './types';

export interface CompilerDiagnostic {
  code: string;
  message: string;
  blockId?: string;
  tabId?: string;
  input?: string;
  callPath?: string[];
}
export type CompileResult =
  { ok: true; program: CompiledProgram } | { ok: false; diagnostics: CompilerDiagnostic[] };
interface Binding {
  tabId: string;
  callPath: string[];
  parameters: Map<string, string | number>;
}
/** Native JSON generation only: no Blockly initialization, text parser, eval or general AST. */
export function compileProject(input: unknown): CompileResult {
  let project: BotProject;
  try {
    project = cloneProject(input);
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'format',
          message: error instanceof Error ? error.message : 'Invalid source.',
          ...(error instanceof ProjectFormatError
            ? { blockId: error.blockId, tabId: error.tabId }
            : {}),
        },
      ],
    };
  }
  const diagnostics = analyzeTactics(project);
  if (diagnostics.length) return { ok: false, diagnostics };
  const roots = new Map(
    project.tabs.map((t) => [
      t.id,
      t.workspace.blocks.blocks.find((b) => ['df_main', 'df_tactic'].includes(b.type))!,
    ]),
  );
  const procedures = new Map(project.procedures.map((p) => [p.id, p]));
  let main: CompiledProgram | undefined;
  for (const tab of project.tabs) {
    const origins: Record<string, NodeOrigin> = {};
    function origin(path: string, b: BlockState, context: Binding) {
      origins[path] = { tabId: context.tabId, blockId: b.id!, callPath: [...context.callPath] };
    }
    function scalar(b: BlockState, context: Binding): string | number {
      // Static scope/type/domain validation has already succeeded. No defaults
      // or name-based substitution are allowed on the executable Main path.
      return b.type === 'df_parameter'
        ? context.parameters.get(b.extraState.parameterId)!
        : b.fields!.VALUE;
    }
    function stack(
      first: BlockState,
      path: string,
      owner: BlockState,
      context: Binding,
    ): AnyChildNodeDefinition {
      const list = siblings(first);
      if (list.length === 1) return emit(list[0], path, context);
      origin(path, owner, context);
      return { type: 'sequence', children: list.map((b, i) => emit(b, `${path}.${i}`, context)) };
    }
    function emit(b: BlockState, path: string, context: Binding): AnyChildNodeDefinition {
      if (b.type === 'df_call') {
        const callee = procedures.get(b.extraState.tacticId)!;
        const root = roots.get(callee.id)!;
        const binding: Binding = {
          tabId: callee.id,
          callPath: [...context.callPath, b.id!],
          parameters: new Map(
            callee.parameters.map((p) => [p.id, scalar(child(b, `ARG_${p.id}`)!, context)]),
          ),
        };
        return stack(child(root, 'BODY')!, path, root, binding);
      }
      origin(path, b, context);
      const body = child(b, 'BODY');
      const slot = (name: string) => scopedSlot(context.callPath, b.fields![name]);
      const value = (name: string) => scalar(child(b, name)!, context);
      if (b.type === 'df_selector' || b.type === 'df_sequence') {
        const node = {
          type: b.type === 'df_selector' ? ('selector' as const) : ('sequence' as const),
          children: siblings(body).map((step, i) => emit(step, `${path}.${i}`, context)),
        };
        return b.type === 'df_sequence' && b.fields!.CLEANUP === 'release-plan'
          ? { ...node, exit: { call: 'ReleasePlan', args: [slot('PLAN')] } }
          : node;
      }
      if (b.type === 'df_retry')
        return {
          type: 'retry',
          attempts: value('ATTEMPTS') as number,
          child: stack(body!, `${path}.0`, b, context),
        };
      let call: string, args: (string | number)[];
      switch (b.type) {
        case 'df_select_city':
          call = 'SelectCity';
          args = [value('QUERY'), value('RANKING'), slot('TARGET')];
          break;
        case 'df_select_sources':
          call = 'SelectSources';
          args = [slot('TARGET'), value('MINIMUM'), slot('OUTPUT')];
          break;
        case 'df_next_city':
          call = 'NextCity';
          args = [slot('LIST'), slot('OUTPUT')];
          break;
        case 'df_clear_set':
          call = 'ClearSet';
          args = [slot('SET')];
          break;
        case 'df_add_to_set':
          call = 'AddToSet';
          args = [slot('SET'), slot('CITY')];
          break;
        case 'df_plan_capture':
          call = 'PlanCapture';
          args = [slot('TARGET'), slot('SOURCES'), value('HORIZON'), slot('PLAN')];
          break;
        case 'df_execute_plan':
          call = 'ExecutePlan';
          args = [slot('PLAN')];
          break;
        default:
          throw new Error('Unreachable admitted block.');
      }
      return { type: 'action', call, args };
    }
    const root = roots.get(tab.id)!;
    const context: Binding = {
      tabId: tab.id,
      callPath: [],
      parameters: new Map(
        (procedures.get(tab.id)?.parameters ?? []).map((p) => [p.id, SCALARS[p.types[0]].default]),
      ),
    };
    // Uncalled definitions receive type-domain representatives only for static
    // read/write analysis (control topology is independent of scalar values).
    // They are NEVER exported or used as executable argument defaults.
    origin('0', root, context);
    const definition: RootNodeDefinition = {
      type: 'root',
      child: stack(child(root, 'BODY')!, '0.0', root, context),
    };
    const checked = validateProgramDefinition(definition);
    if (!checked.ok)
      diagnostics.push(
        ...checked.diagnostics.map((d) => ({
          code: d.code,
          message: d.message,
          ...origins[d.path],
        })),
      );
    else if (tab.id === 'main') main = { definition: checked.definition, origins };
  }
  return diagnostics.length ? { ok: false, diagnostics } : { ok: true, program: main! };
}
