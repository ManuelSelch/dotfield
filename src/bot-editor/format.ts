import { BLOCK_TYPES, CATALOG, SCALARS } from './catalog';
import {
  BLOCKLY_VERSION,
  PROCEDURES_VERSION,
  PROJECT_VERSION,
  SCALAR_TYPES,
  SLOT_KINDS,
  SOURCE_LIMITS,
} from './types';
import type { ArgumentShape, BotProject, ScalarType, SlotKind } from './types';

export class ProjectFormatError extends Error {
  blockId?: string;
  tabId?: string;
  constructor(message: string) {
    super(`Bot project: ${message}`);
  }
}
function fail(message: string): never {
  throw new ProjectFormatError(message);
}
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function keys(obj: Record<string, unknown>, allowed: string[], label: string) {
  if (Object.keys(obj).some((k) => !allowed.includes(k))) fail(`unsupported ${label} property.`);
}
function array(value: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(`invalid ${label} count.`);
  return value;
}
function id(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[^\s]{1,80}$/.test(value)) fail('invalid stable identity.');
}
function name(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) fail('invalid name.');
}
function unique(values: unknown[], label: string) {
  if (new Set(values).size !== values.length) fail(`duplicate ${label}.`);
}
function scalar(value: unknown): asserts value is ScalarType {
  if (!SCALAR_TYPES.includes(value as ScalarType)) fail('unsupported scalar type.');
}
function identityList(items: Record<string, unknown>[], label: string) {
  items.forEach((i) => {
    id(i.id);
    name(i.name);
  });
  unique(
    items.map((i) => i.id),
    `${label} identity`,
  );
  unique(
    items.map((i) => i.name),
    `${label} name`,
  );
}

/** Strict structural decoder before Blockly can clamp fields or discard connections.
 * Semantic compilation (dataflow, recursion, argument compatibility) is a later layer.
 */
export function decodeProject(value: unknown): BotProject {
  const p = object(value, 'project');
  keys(
    p,
    ['format', 'version', 'blocklyVersion', 'proceduresVersion', 'procedures', 'tabs', 'editor'],
    'project',
  );
  if (p.format !== 'dotfield-bot' || p.version !== PROJECT_VERSION)
    fail('unsupported format/version.');
  if (p.blocklyVersion !== BLOCKLY_VERSION) fail('unsupported Blockly version.');
  if (p.proceduresVersion !== PROCEDURES_VERSION)
    fail('unsupported procedure-model dependency version.');
  const procedures = array(p.procedures, SOURCE_LIMITS.tactics, 'tactic').map((x) =>
    object(x, 'tactic'),
  );
  identityList(procedures, 'tactic');
  for (const proc of procedures) {
    keys(proc, ['id', 'name', 'returnTypes', 'parameters'], 'tactic');
    if (proc.id === 'main' || proc.returnTypes !== null)
      fail('invalid tactic identity or return types.');
    const parameters = array(proc.parameters, SOURCE_LIMITS.parameters, 'parameter').map((x) =>
      object(x, 'parameter'),
    );
    identityList(parameters, 'parameter');
    for (const param of parameters) {
      keys(param, ['id', 'name', 'types'], 'parameter');
      const types = array(param.types, 1, 'parameter type');
      if (types.length !== 1) fail('exactly one scalar parameter type is required.');
      scalar(types[0]);
    }
  }
  const tabs = array(p.tabs, SOURCE_LIMITS.tactics + 1, 'tab').map((x) => object(x, 'tab'));
  tabs.forEach((t) => id(t.id));
  unique(
    tabs.map((t) => t.id),
    'tab',
  );
  if (
    tabs.length !== procedures.length + 1 ||
    !tabs.some((t) => t.id === 'main') ||
    procedures.some((pr) => !tabs.some((t) => t.id === pr.id))
  )
    fail('tabs must match Main and tactic identities.');
  const editor = object(p.editor, 'editor');
  keys(editor, ['activeTab'], 'editor');
  if (!tabs.some((t) => t.id === editor.activeTab)) fail('unknown active tab.');
  const blockIds = new Set<string>();
  let count = 0;
  for (const tab of tabs) {
    keys(tab, ['id', 'slots', 'workspace'], 'tab');
    const slots = array(tab.slots, SOURCE_LIMITS.slots, 'slot').map((x) => object(x, 'slot'));
    identityList(slots, 'slot');
    for (const slot of slots) {
      keys(slot, ['id', 'name', 'kind'], 'slot');
      if (!SLOT_KINDS.includes(slot.kind as SlotKind)) fail('unknown slot kind.');
    }
    const ws = object(tab.workspace, 'workspace');
    keys(ws, ['blocks'], 'workspace');
    const blocks = object(ws.blocks, 'workspace blocks');
    keys(blocks, ['languageVersion', 'blocks'], 'workspace blocks');
    if (blocks.languageVersion !== 0) fail('unsupported Blockly workspace language version.');
    const roots = array(blocks.blocks, SOURCE_LIMITS.blocks, 'top block');
    let entries = 0;
    const walk = (raw: unknown, expected: string, depth: number, nested = false): void => {
      try {
        if (++count > SOURCE_LIMITS.blocks || depth > SOURCE_LIMITS.depth)
          fail('block count/depth limit exceeded.');
        const b = object(raw, 'block');
        keys(
          b,
          ['type', 'id', 'fields', 'inputs', 'next', 'extraState', 'x', 'y', 'collapsed', 'inline'],
          'block',
        );
        id(b.id);
        if (blockIds.has(b.id)) fail('duplicate block identity.');
        blockIds.add(b.id);
        if (typeof b.type !== 'string' || !BLOCK_TYPES.has(b.type)) fail('unsupported block type.');
        for (const coord of ['x', 'y'])
          if (
            b[coord] !== undefined &&
            (typeof b[coord] !== 'number' || !Number.isFinite(b[coord]))
          )
            fail('invalid block position.');
        for (const flag of ['collapsed', 'inline'])
          if (b[flag] !== undefined && typeof b[flag] !== 'boolean') fail('invalid editor flag.');
        const fields = b.fields === undefined ? {} : object(b.fields, 'fields');
        const inputs = b.inputs === undefined ? {} : object(b.inputs, 'inputs');
        const spec = CATALOG[b.type];
        const literalType = SCALAR_TYPES.find((t) => b.type === `df_${t}`);
        const root = b.type === 'df_main' || b.type === 'df_tactic';
        const output =
          literalType ??
          (b.type === 'df_parameter'
            ? object(b.extraState, 'parameter reference').type
            : root
              ? 'root'
              : 'step');
        if (expected !== 'top' && output !== expected) fail('incompatible block connection.');
        if (root) {
          if (nested || (tab.id === 'main' ? b.type !== 'df_main' : b.type !== 'df_tactic'))
            fail('misplaced entry block.');
          entries++;
        }
        let allowedInputs: Record<string, string> = spec?.inputs
          ? { ...spec.inputs }
          : root
            ? { BODY: 'body' }
            : {};
        if (literalType) {
          keys(fields, ['VALUE'], 'literal field');
          const domain = SCALARS[literalType],
            v = fields.VALUE;
          if (
            domain.values
              ? !domain.values.includes(v as string)
              : !Number.isInteger(v) || (v as number) < domain.min! || (v as number) > domain.max!
          )
            fail('invalid literal value (no clamping on load).');
        } else if (spec) {
          keys(
            fields,
            [...Object.keys(spec.slots ?? {}), ...(spec.cleanup ? ['CLEANUP'] : [])],
            'primitive field',
          );
          if (spec.cleanup && !['none', 'release-plan'].includes(fields.CLEANUP as string))
            fail('invalid cleanup.');
          for (const [field, kind] of Object.entries(spec.slots ?? {}))
            if (!slots.some((s) => s.id === fields[field] && s.kind === kind))
              fail(`invalid ${kind} slot in ${field}.`);
        } else keys(fields, [], 'block field');
        if (b.type === 'df_call') {
          const state = object(b.extraState, 'call');
          keys(state, ['tacticId', 'arguments'], 'call');
          id(state.tacticId);
          if (!procedures.some((pr) => pr.id === state.tacticId)) fail('missing tactic reference.');
          // Preserve obsolete/typed arguments so signature edits stay visibly invalid
          // rather than being silently repaired. Semantic checks belong to slice 4.
          const args = array(state.arguments, SOURCE_LIMITS.blocks, 'call argument').map((a) =>
            object(a, 'call argument'),
          );
          unique(
            args.map((a) => a.parameterId),
            'argument identity',
          );
          for (const arg of args) {
            keys(arg, ['parameterId', 'type'], 'call argument');
            id(arg.parameterId);
            scalar(arg.type);
          }
          allowedInputs = Object.fromEntries(
            (args as unknown as ArgumentShape[]).map((a) => [`ARG_${a.parameterId}`, a.type]),
          );
        } else if (b.type === 'df_tactic') {
          const state = object(b.extraState, 'definition');
          keys(state, ['tacticId'], 'definition');
          if (state.tacticId !== tab.id) fail('definition identity does not match its tab.');
        } else if (b.type === 'df_parameter') {
          const state = object(b.extraState, 'parameter reference');
          keys(state, ['parameterId', 'type'], 'parameter reference');
          id(state.parameterId);
          scalar(state.type);
          // Unresolved parameter references remain editable and are not auto-bound by name.
        } else if (b.extraState !== undefined) fail('unexpected extra block state.');
        keys(inputs, Object.keys(allowedInputs), 'block input');
        for (const [input, connection] of Object.entries(inputs)) {
          const c = object(connection, 'connection');
          keys(c, ['block', 'shadow'], 'connection');
          if (c.block === undefined && c.shadow === undefined) fail('empty serialized connection.');
          for (const child of ['block', 'shadow'])
            if (c[child] !== undefined) {
              const childState = object(c[child], 'child block');
              if (child === 'shadow' && !SCALAR_TYPES.some((t) => childState.type === `df_${t}`))
                fail('only scalar literals may be shadows.');
              walk(
                c[child],
                allowedInputs[input] === 'body' ? 'step' : allowedInputs[input],
                depth + 1,
                true,
              );
            }
        }
        if (b.next !== undefined) {
          if (output !== 'step') fail('only executable steps may have a next connection.');
          const next = object(b.next, 'next');
          keys(next, ['block'], 'next');
          // Sibling length consumes count, not nesting depth.
          walk(next.block, 'step', depth, true);
        }
      } catch (error) {
        if (error instanceof ProjectFormatError && !error.blockId) {
          error.tabId = tab.id as string;
          if (raw && typeof raw === 'object' && 'id' in raw && typeof raw.id === 'string')
            error.blockId = raw.id;
        }
        throw error;
      }
    };
    roots.forEach((b) => walk(b, 'top', 0));
    if (entries !== 1) fail('each tab requires exactly one entry definition.');
  }
  return value as BotProject;
}

export function parseProject(text: string): BotProject {
  if (new TextEncoder().encode(text).byteLength > SOURCE_LIMITS.bytes)
    fail('serialized byte limit exceeded.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    fail('invalid JSON.');
  }
  return decodeProject(value);
}
/** Clone at the boundary: input mutation never edits a loaded session. */
export function cloneProject(value: unknown): BotProject {
  let text: string | undefined;
  try {
    text = JSON.stringify(value);
  } catch {
    fail('expected finite JSON source, not cyclic objects.');
  }
  if (text === undefined) fail('expected a project object.');
  return parseProject(text);
}
