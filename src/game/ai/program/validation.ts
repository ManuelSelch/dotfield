import type {
  AnyChildNodeDefinition,
  RootNodeDefinition,
} from 'mistreevous/dist/BehaviourTreeDefinition';

import { ACTIONS } from './definition';
import type { MemoryKind, ProgramIssue } from './definition';
import { PROGRAM_LIMITS as L } from './limits';

type Result =
  { ok: true; definition: RootNodeDefinition } | { ok: false; diagnostics: ProgramIssue[] };
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const slotName = (v: unknown): v is string => typeof v === 'string' && /^[^\s]{1,512}$/.test(v);
const intersection = (sets: Set<string>[]) =>
  new Set([...(sets[0] ?? [])].filter((v) => sets.every((s) => s.has(v))));
const frozen = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
};

/** Independent of Blockly/React. Revalidate every native program, including saved JSON. */
export function validateProgramDefinition(input: unknown): Result {
  const diagnostics: ProgramIssue[] = [];
  const issue = (path: string, code: string, message: string) => {
    diagnostics.push({ path, code, message });
  };
  let value: unknown;
  try {
    const json = JSON.stringify(input);
    if (json === undefined || new TextEncoder().encode(json).length > L.bytes)
      throw new Error('Native program byte limit exceeded.');
    value = JSON.parse(json);
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          path: '0',
          code: 'format',
          message: error instanceof Error ? error.message : 'Expected finite JSON.',
        },
      ],
    };
  }
  const slots = new Map<string, MemoryKind>();
  function slot(v: unknown, kind: MemoryKind, path: string) {
    if (!slotName(v)) {
      issue(path, 'slot', 'Expected a named memory slot.');
      return;
    }
    if (slots.has(v) && slots.get(v) !== kind)
      issue(path, 'slot-kind', `Slot ${v} is used with incompatible memory kinds.`);
    slots.set(v, kind);
  }
  let count = 0;
  function walk(raw: unknown, path: string, depth: number) {
    if (++count > L.nodes || depth > L.depth) {
      issue(path, 'size', 'Native node/depth limit exceeded.');
      return;
    }
    if (!record(raw)) {
      issue(path, 'shape', 'Expected a native node.');
      return;
    }
    let allowed: string[] = [];
    switch (raw.type) {
      case 'root':
        allowed = ['type', 'child'];
        if (depth !== 0) issue(path, 'shape', 'Only one outer root is allowed.');
        walk(raw.child, `${path}.0`, depth + 1);
        break;
      case 'sequence':
      case 'selector':
        allowed = raw.type === 'sequence' ? ['type', 'children', 'exit'] : ['type', 'children'];
        if (!Array.isArray(raw.children) || !raw.children.length || raw.children.length > L.nodes)
          issue(path, 'empty', 'A group requires a bounded, nonempty child list.');
        else raw.children.forEach((child, i) => walk(child, `${path}.${i}`, depth + 1));
        if (raw.exit !== undefined) {
          const exit = raw.exit;
          if (
            !record(exit) ||
            Object.keys(exit).some((k) => !['call', 'args'].includes(k)) ||
            exit.call !== 'ReleasePlan' ||
            !Array.isArray(exit.args) ||
            exit.args.length !== 1
          )
            issue(path, 'callback', 'Only explicit ReleasePlan(plan) exit cleanup is allowed.');
          else slot(exit.args[0], 'capture-plan', path);
        }
        break;
      case 'retry':
        allowed = ['type', 'attempts', 'child'];
        if (
          !Number.isInteger(raw.attempts) ||
          (raw.attempts as number) < 1 ||
          (raw.attempts as number) > L.attempts
        )
          issue(path, 'number', `Retry attempts must be 1–${L.attempts}.`);
        walk(raw.child, `${path}.0`, depth + 1);
        break;
      case 'action': {
        allowed = ['type', 'call', 'args'];
        if (typeof raw.call !== 'string' || !Object.hasOwn(ACTIONS, raw.call)) {
          issue(path, 'method', 'Unsupported action method.');
          break;
        }
        const specs = ACTIONS[raw.call];
        if (!Array.isArray(raw.args) || raw.args.length !== specs.length) {
          issue(path, 'arguments', `Invalid arguments for ${raw.call}.`);
          break;
        }
        specs.forEach((spec, i) => {
          const arg = (raw.args as unknown[])[i];
          if (typeof spec === 'object') slot(arg, spec.slot, path);
          else if (
            spec === 'query'
              ? !['neutral', 'enemy'].includes(arg as string)
              : spec === 'ranking'
                ? arg !== 'nearest-reachable'
                : !Number.isInteger(arg) ||
                  (arg as number) < 1 ||
                  (arg as number) > (spec === 'horizon' ? L.horizonMs : L.minimumArmy)
          )
            issue(
              path,
              'argument-value',
              spec === 'horizon'
                ? `Forecast admission is 1–${L.horizonMs} ms; the source value was not changed.`
                : `Unsupported ${spec} argument.`,
            );
        });
        break;
      }
      default:
        issue(path, 'node-type', 'Unsupported native node type.');
        return;
    }
    if (Object.keys(raw).some((k) => !allowed.includes(k)))
      issue(path, 'attribute', 'Unsupported native node property/callback.');
  }
  if (!record(value) || value.type !== 'root')
    issue('0', 'root', 'Expected exactly one native root.');
  else walk(value, '0', 0);
  if (diagnostics.length) return { ok: false, diagnostics };
  const definition = value as RootNodeDefinition;
  interface Flow {
    success: Set<string>;
    failure: Set<string>;
  }
  let visits = 0;
  function flow(
    node: AnyChildNodeDefinition | RootNodeDefinition,
    path: string,
    input: Set<string>,
  ): Flow {
    if (++visits > L.analysisVisits) {
      if (visits === L.analysisVisits + 1)
        issue(path, 'analysis-budget', 'Static analysis budget exceeded. Simplify nested retries.');
      return { success: new Set(), failure: new Set() };
    }
    if (node.type === 'action') {
      const success = new Set(input),
        failure = new Set(input);
      ACTIONS[node.call].forEach((spec, i) => {
        if (typeof spec !== 'object') return;
        const name = node.args![i] as string;
        if (spec.access !== 'write' && !input.has(name))
          issue(
            path,
            'read-before-write',
            `Slot ${name} is not initialized on every path to this action.`,
          );
        if (spec.access === 'write') {
          success.add(name);
          failure.delete(name);
        }
      });
      if (node.call === 'ExecutePlan') failure.delete(node.args![0] as string);
      return { success, failure };
    }
    if (node.type === 'root') return flow(node.child, `${path}.0`, input);
    if (node.type === 'retry') {
      let state = new Set(input),
        failure = state;
      const successes: Set<string>[] = [];
      for (let attempt = 0; attempt < (node.attempts as number); attempt++) {
        const result = flow(node.child, `${path}.0`, state);
        successes.push(result.success);
        failure = result.failure;
        const next = intersection([state, failure]);
        if (next.size === state.size || visits > L.analysisVisits) break;
        state = next;
      }
      return { success: intersection(successes), failure };
    }
    if (node.type === 'sequence' || node.type === 'selector') {
      const alternatives: Set<string>[] = [];
      let state = new Set(input);
      node.children.forEach((child, i) => {
        const result = flow(child, `${path}.${i}`, state);
        alternatives.push(node.type === 'sequence' ? result.failure : result.success);
        state = node.type === 'sequence' ? result.success : result.failure;
      });
      const result =
        node.type === 'sequence'
          ? { success: state, failure: intersection(alternatives) }
          : { success: intersection(alternatives), failure: state };
      if (node.exit) {
        const plan = node.exit.args![0] as string;
        result.success.delete(plan);
        result.failure.delete(plan);
      }
      return result;
    }
    throw new Error('Unreachable admitted node.');
  }
  flow(definition, '0', new Set());
  const unique = [
    ...new Map(diagnostics.map((d) => [`${d.path}:${d.code}:${d.message}`, d])).values(),
  ];
  return unique.length
    ? { ok: false, diagnostics: unique }
    : { ok: true, definition: frozen(definition) };
}
