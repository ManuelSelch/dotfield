import { describe, it, expect } from 'vitest';

import { compileProject } from './compiler';
import { createDefaultProject } from './default-project';
import {
  DraftHistory,
  editProject,
  findBlock,
  insertStep,
  moveStep,
  moveInto,
  removeStep,
  createTactic,
  deleteTactic,
  changeSignature,
  bindInput,
} from './editing';

describe('transactional project editing and whole-project undo', () => {
  it('creates, renames and deletes unreferenced tactics with undo/redo restoring identities', () => {
    const h = new DraftHistory(createDefaultProject());
    h.record(editProject(h.current, (p) => createTactic(p, 'Other', 'other')));
    expect(h.dirty).toBe(true);
    expect(h.current.tabs).toHaveLength(3);
    h.undo();
    expect(h.current.tabs).toHaveLength(2);
    h.redo();
    expect(h.current.procedures[1].id).toBe('other');
    h.record(editProject(h.current, (p) => deleteTactic(p, 'other')));
    expect(h.current.tabs).toHaveLength(2);
    h.undo();
    expect(h.current.tabs).toHaveLength(3);
  });
  it('blocks referenced deletion and duplicate names without modifying the input', () => {
    const p = createDefaultProject(),
      before = JSON.stringify(p);
    expect(() => editProject(p, (d) => deleteTactic(d, 'capture'))).toThrow(/referenced/i);
    expect(() => editProject(p, (d) => createTactic(d, 'Capture', 'another'))).toThrow();
    expect(JSON.stringify(p)).toBe(before);
  });
  it('preserves incompatible arguments across signature edits, with undo restoring valid calls', () => {
    const h = new DraftHistory(createDefaultProject());
    h.record(
      changeSignature(h.current, 'capture', [{ id: 'kind', name: 'which', types: ['army'] }]),
    );
    expect(compileProject(h.current).ok).toBe(false);
    expect(findBlock(h.current, 'neutral-call')!.inputs!.ARG_kind.shadow!.fields!.VALUE).toBe(
      'neutral',
    );
    h.undo();
    expect(compileProject(h.current).ok).toBe(true);
    h.redo();
    expect(compileProject(h.current).ok).toBe(false);
  });
  it('repairs incompatible bindings only on explicit user commands, never by position', () => {
    let p = changeSignature(createDefaultProject(), 'capture', [
      { id: 'kind', name: 'which', types: ['army'] },
    ]);
    p = editProject(p, (d) => {
      bindInput(d, 'neutral-call', 'ARG_kind', 'army', 9);
      bindInput(d, 'enemy-call', 'ARG_kind', 'army', 12);
    });
    expect(findBlock(p, 'neutral-call')!.extraState.arguments).toEqual([
      { parameterId: 'kind', type: 'army' },
    ]);
    expect(findBlock(p, 'neutral-call')!.inputs!.ARG_kind.shadow!.fields!.VALUE).toBe(9);
  });
  it('reorders siblings, inserts at a group, nests/moves/deletes without dropping following steps', () => {
    let p = editProject(createDefaultProject(), (d) => moveStep(d, 'enemy-call', false));
    expect(findBlock(p, 'main-priority')!.inputs!.BODY.block!.id).toBe('enemy-call');
    p = editProject(p, (d) => insertStep(d, 'main', 'main-priority', 'df_sequence', 'group'));
    p = editProject(p, (d) => moveInto(d, 'neutral-call', 'group'));
    expect(findBlock(p, 'group')!.inputs!.BODY.block!.id).toBe('neutral-call');
    expect(() => editProject(p, (d) => moveInto(d, 'group', 'group'))).toThrow(/cycle/i);
    expect(() => editProject(p, (d) => moveInto(d, 'group', 'neutral-call'))).toThrow();
    p = editProject(p, (d) => removeStep(d, 'group'));
    expect(findBlock(p, 'neutral-call')).toBeUndefined();
    expect(findBlock(p, 'enemy-call')).toBeTruthy();
  });
  it('rejects nesting into a descendant and protects entry roots', () => {
    const p = createDefaultProject();
    expect(() => editProject(p, (d) => moveInto(d, 'capture-body', 'attempt-capture'))).toThrow(
      /cycle/i,
    );
    expect(() => editProject(p, (d) => removeStep(d, 'main-entry'))).toThrow(/entry/i);
  });
  it('tab navigation alone is not dirty; Save baselines and Reset stay independent of stored data', () => {
    const h = new DraftHistory(createDefaultProject());
    h.selectTab('capture');
    expect(h.dirty).toBe(false);
    h.record(
      editProject(h.current, (p) => {
        p.procedures[0].name = 'Take';
      }),
    );
    h.markSaved();
    expect(h.dirty).toBe(false);
    h.record(createDefaultProject());
    expect(h.dirty).toBe(true);
    h.undo();
    expect(h.current.procedures[0].name).toBe('Take');
  });
  it('canonical JSON property order never creates fake dirty/undo entries', () => {
    const p = createDefaultProject(),
      h = new DraftHistory(p);
    const reordered = JSON.parse(JSON.stringify(p), (_key, value) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).reverse())
        : value,
    );
    h.record(reordered);
    expect(h.dirty).toBe(false);
    expect(h.canUndo).toBe(false);
  });
  it('retains following detached siblings when removing an orphan stack head', () => {
    const p = createDefaultProject();
    p.tabs[0].workspace.blocks.blocks.push({
      id: 'orphan',
      type: 'df_clear_set',
      fields: { SET: 'chosen' },
      next: { block: { id: 'following', type: 'df_clear_set', fields: { SET: 'chosen' } } },
    });
    const changed = editProject(p, (d) => removeStep(d, 'orphan'));
    expect(findBlock(changed, 'orphan')).toBeUndefined();
    expect(findBlock(changed, 'following')).toBeTruthy();
  });
  it('bounds history and rolls back oversized authoring commands', () => {
    const h = new DraftHistory(createDefaultProject());
    for (let i = 0; i < 40; i++)
      h.record(
        editProject(h.current, (p) => {
          p.procedures[0].name = `Capture${i}`;
        }),
      );
    for (let i = 0; i < 32; i++) h.undo();
    expect(h.canUndo).toBe(false);
    expect(h.current.procedures[0].name).toBe('Capture7');
    const before = JSON.stringify(h.current);
    expect(() =>
      editProject(h.current, (p) => {
        for (let i = 0; i < 140; i++)
          insertStep(p, 'main', 'main-priority', 'df_clear_set', `extra${i}`);
      }),
    ).toThrow(/limit/i);
    expect(JSON.stringify(h.current)).toBe(before);
  });
  it('new signature arguments stay empty until the player explicitly binds them', () => {
    const p = changeSignature(createDefaultProject(), 'capture', [
      { id: 'kind', name: 'kind', types: ['query'] },
      { id: 'limit', name: 'limit', types: ['attempts'] },
    ]);
    expect(findBlock(p, 'neutral-call')!.inputs!.ARG_limit).toBeUndefined();
    expect(compileProject(p).ok).toBe(false);
  });
});
