import { compareCodeUnits } from '@/shared/domain/compare-code-units';

import { CATALOG, SCALARS } from './catalog';
import { createDefaultProject } from './default-project';
import { cloneProject } from './format';
import { loadProject } from './project';
import type { BlockState, BotProject, ParameterState, ScalarType } from './types';
const copy = (p: BotProject): BotProject => JSON.parse(JSON.stringify(p));
const key = (p: BotProject) =>
  JSON.stringify({ ...p, editor: { activeTab: 'main' } }, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort(compareCodeUnits)
            .map((k) => [k, value[k]]),
        )
      : value,
  );
export class DraftHistory {
  current: BotProject;
  private saved: string;
  private past: BotProject[] = [];
  private future: BotProject[] = [];
  constructor(p: BotProject) {
    this.current = cloneProject(p);
    this.saved = key(this.current);
  }
  get dirty() {
    return key(this.current) !== this.saved;
  }
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
  record(p: BotProject) {
    const next = cloneProject(p);
    if (key(next) !== key(this.current)) {
      this.past.push(this.current);
      if (this.past.length > 32) this.past.shift();
      this.future = [];
    }
    this.current = next;
  }
  selectTab(id: string) {
    if (!this.current.tabs.some((t) => t.id === id)) throw Error('Unknown tab.');
    this.current = { ...this.current, editor: { activeTab: id } };
  }
  markSaved() {
    this.saved = key(this.current);
  }
  canonicalizeInitial(p: BotProject) {
    this.current = cloneProject(p);
    this.saved = key(this.current);
    this.past = [];
    this.future = [];
  }
  undo() {
    const p = this.past.pop();
    if (p) {
      this.future.push(this.current);
      this.restore(p);
    }
  }
  redo() {
    const p = this.future.pop();
    if (p) {
      this.past.push(this.current);
      this.restore(p);
    }
  }
  private restore(p: BotProject) {
    const id = this.current.editor.activeTab;
    this.current = copy(p);
    if (p.tabs.some((t) => t.id === id)) this.current.editor.activeTab = id;
  }
}
/** Validate a candidate copy before replacing live workspaces; failures roll back. */
export function editProject(p: BotProject, edit: (draft: BotProject) => void): BotProject {
  const next = copy(p);
  edit(next);
  return cloneProject(next);
}
export function allBlocks(p: BotProject, tabId?: string): BlockState[] {
  const result: BlockState[] = [];
  function walk(b: BlockState) {
    result.push(b);
    for (const c of Object.values(b.inputs ?? {})) {
      if (c.block) walk(c.block);
      if (c.shadow) walk(c.shadow);
    }
    if (b.next?.block) walk(b.next.block);
  }
  for (const tab of p.tabs)
    if (!tabId || tab.id === tabId) tab.workspace.blocks.blocks.forEach(walk);
  return result;
}
export const findBlock = (p: BotProject, id: string) => allBlocks(p).find((b) => b.id === id);
const entry = (b: BlockState) => b.type === 'df_main' || b.type === 'df_tactic';
function link(p: BotProject, id: string): { block: BlockState } | undefined {
  for (const b of allBlocks(p)) {
    if (b.next?.block?.id === id) return b.next as { block: BlockState };
    for (const c of Object.values(b.inputs ?? {}))
      if (c.block?.id === id) return c as { block: BlockState };
  }
}
function detach(p: BotProject, id: string): BlockState {
  const b = findBlock(p, id);
  if (!b) throw Error('Choose a step.');
  if (entry(b)) throw Error('Entry definitions cannot be moved/deleted.');
  const parent = link(p, id);
  if (parent)
    if (b.next?.block) parent.block = b.next.block;
    else delete (parent as { block?: BlockState }).block;
  else
    for (const tab of p.tabs)
      tab.workspace.blocks.blocks = tab.workspace.blocks.blocks.flatMap((n) =>
        n.id !== id ? [n] : b.next?.block ? [b.next.block] : [],
      );

  // Empty connection objects are not a valid serialized connection.
  for (const owner of allBlocks(p)) {
    if (owner.next && !owner.next.block) delete owner.next;
    for (const [name, c] of Object.entries(owner.inputs ?? {}))
      if (!c.block && !c.shadow) delete owner.inputs![name];
  }
  delete b.next;
  return b;
}
export function removeStep(p: BotProject, id: string) {
  detach(p, id);
}
export function moveStep(p: BotProject, id: string, down: boolean) {
  if (!down) {
    const previous = allBlocks(p).find((b) => b.next?.block?.id === id);
    if (!previous) throw Error('Already first in this group.');
    return moveStep(p, previous.id!, true);
  }
  const b = findBlock(p, id),
    parent = link(p, id);
  if (!b || !parent || !b.next?.block) throw Error('No following sibling.');
  const next = b.next.block;
  b.next = next.next;
  next.next = { block: b };
  parent.block = next;
}
export function moveInto(p: BotProject, id: string, destination: string) {
  const b = findBlock(p, id),
    target = findBlock(p, destination);
  if (!b || !target) throw Error('Choose a step and group.');
  function contains(n: BlockState): boolean {
    return (
      n.id === destination ||
      Object.values(n.inputs ?? {}).some((c) => !!c.block && containsStack(c.block))
    );
  }
  function containsStack(n: BlockState): boolean {
    return contains(n) || (!!n.next?.block && containsStack(n.next.block));
  }
  if (contains(b)) throw Error('A group cannot contain itself or a descendant (cycle).');
  if (!entry(target) && CATALOG[target.type]?.inputs?.BODY !== 'body')
    throw Error('Destination must be a group.');
  const moved = detach(p, id);
  target.inputs ??= {};
  const first = target.inputs.BODY?.block;
  if (!first) target.inputs.BODY = { block: moved };
  else {
    let tail = first;
    while (tail.next?.block) tail = tail.next.block;
    tail.next = { block: moved };
  }
}
export function insertStep(
  p: BotProject,
  tabId: string,
  selected: string,
  type: string,
  id: string = crypto.randomUUID(),
  tacticId?: string,
) {
  const tab = p.tabs.find((t) => t.id === tabId)!,
    parent = findBlock(p, selected);
  if (!parent) throw Error('Select a group or step first.');
  const block: BlockState = { type, id };
  if (type === 'df_call') {
    const tactic = p.procedures.find((t) => t.id === tacticId);
    if (!tactic) throw Error('Choose a tactic.');
    block.extraState = { tacticId, arguments: [] };
    for (const param of tactic.parameters)
      bindBlock(block, `ARG_${param.id}`, param.types[0], SCALARS[param.types[0]].default);
  } else {
    const spec = CATALOG[type];
    if (!spec) throw Error('Unsupported library step.');
    block.fields = {};
    if (spec.cleanup) block.fields.CLEANUP = 'none';
    for (const [field, kind] of Object.entries(spec.slots ?? {})) {
      const slots = tab.slots.filter((s) => s.kind === kind);
      const preferred = ['OUTPUT', 'CITY'].includes(field) ? 'source' : 'target';
      const slot = slots.find((s) => s.id === preferred) ?? slots[0];
      if (!slot) throw Error(`Declare a ${kind} slot first.`);
      block.fields[field] = slot.id;
    }
    for (const [input, kind] of Object.entries(spec.inputs ?? {}))
      if (kind !== 'body') bindBlock(block, input, kind, SCALARS[kind].default);
  }
  const group = entry(parent) || CATALOG[parent.type]?.inputs?.BODY === 'body';
  if (group) {
    parent.inputs ??= {};
    const first = parent.inputs.BODY?.block;
    if (first) block.next = { block: first };
    parent.inputs.BODY = { block };
  } else {
    block.next = parent.next;
    parent.next = { block };
  }
  return id;
}
function bindBlock(
  b: BlockState,
  input: string,
  type: ScalarType,
  value: string | number,
  parameterId?: string,
) {
  b.inputs ??= {};
  const id = crypto.randomUUID();
  b.inputs[input] = parameterId
    ? { block: { id, type: 'df_parameter', extraState: { parameterId, type } } }
    : { shadow: { id, type: `df_${type}`, fields: { VALUE: value } } };
  if (b.type === 'df_call') {
    const paramId = input.slice(4);
    const args = b.extraState.arguments as { parameterId: string; type: ScalarType }[];
    const existing = args.find((a) => a.parameterId === paramId);
    if (existing) existing.type = type;
    else args.push({ parameterId: paramId, type });
  }
}
export function bindInput(
  p: BotProject,
  id: string,
  input: string,
  type: ScalarType,
  value: string | number,
  parameterId?: string,
) {
  const b = findBlock(p, id);
  if (!b) throw Error('Choose a step.');
  bindBlock(b, input, type, value, parameterId);
}
export function createTactic(p: BotProject, name: string, id: string = crypto.randomUUID()) {
  p.procedures.push({ id, name, returnTypes: null, parameters: [] });
  p.tabs.push({
    id,
    slots: createDefaultProject().tabs[1].slots,
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          { id: `${id}-entry`, type: 'df_tactic', extraState: { tacticId: id }, x: 24, y: 24 },
        ],
      },
    },
  });
  p.editor.activeTab = id;
}
export function deleteTactic(p: BotProject, id: string) {
  if (id === 'main') throw Error('Main cannot be deleted.');
  if (allBlocks(p).some((b) => b.type === 'df_call' && b.extraState.tacticId === id))
    throw Error('This tactic is referenced. Remove its call blocks before deleting it.');
  p.procedures = p.procedures.filter((t) => t.id !== id);
  p.tabs = p.tabs.filter((t) => t.id !== id);
  if (p.editor.activeTab === id) p.editor.activeTab = 'main';
}
export function changeSignature(
  p: BotProject,
  id: string,
  parameters: ParameterState[],
): BotProject {
  const next = editProject(p, (d) => {
    const tactic = d.procedures.find((t) => t.id === id);
    if (!tactic) throw Error('Choose a tactic.');
    tactic.parameters = parameters;
  });
  const session = loadProject(next);
  try {
    return session.save();
  } finally {
    session.dispose();
  }
}
