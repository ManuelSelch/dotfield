import { describe, it, expect } from 'vitest';

import { createDefaultProject } from './default-project';
import { projectKey, readEnemyProject, saveEnemyProject } from './storage';
const storage = () => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
};
describe('explicit enemy project persistence', () => {
  it('saves only validated editable source for that enemy and revalidates on reopen', () => {
    const s = storage(),
      p = createDefaultProject();
    expect(readEnemyProject('enemy', s).project).toBeNull();
    expect(saveEnemyProject('enemy', p, { expected: null }, s).ok).toBe(true);
    expect(readEnemyProject('enemy', s).project).toEqual(p);
    expect(readEnemyProject('enemy-2', s).project).toBeNull();
    expect(JSON.parse(s.getItem(projectKey('enemy'))!)).not.toHaveProperty('definition');
  });
  it('preserves last-valid data on invalid Save, including recursion', () => {
    const s = storage(),
      p = createDefaultProject();
    saveEnemyProject('enemy', p, { expected: null }, s);
    const before = s.getItem(projectKey('enemy'))!;
    p.tabs[0].workspace.blocks.blocks[0].inputs = {};
    expect(saveEnemyProject('enemy', p, { expected: before }, s).ok).toBe(false);
    expect(s.getItem(projectKey('enemy'))).toBe(before);
  });
  it('protects unsupported/corrupt saved source until explicitly replacing it', () => {
    const s = storage();
    s.setItem(projectKey('enemy'), '{"version":999}');
    const read = readEnemyProject('enemy', s);
    expect(read.recovery).toBe(true);
    expect(read.error).toBeTruthy();
    expect(saveEnemyProject('enemy', createDefaultProject(), { expected: read.token }, s).ok).toBe(
      false,
    );
    expect(
      saveEnemyProject(
        'enemy',
        createDefaultProject(),
        { expected: read.token, replaceUnreadable: true },
        s,
      ).ok,
    ).toBe(true);
  });
  it('detects another tab changing the saved project', () => {
    const s = storage();
    const initial = readEnemyProject('enemy', s);
    s.setItem(projectKey('enemy'), 'changed');
    expect(
      saveEnemyProject('enemy', createDefaultProject(), { expected: initial.token }, s).ok,
    ).toBe(false);
    expect(s.getItem(projectKey('enemy'))).toBe('changed');
  });
  it('reports unavailable/full storage instead of false success', () => {
    const blocked = {
      getItem: () => {
        throw Error('blocked');
      },
      setItem: () => {
        throw Error('full');
      },
    };
    expect(readEnemyProject('enemy', blocked).error).toMatch(/storage/i);
    expect(saveEnemyProject('enemy', createDefaultProject(), { expected: null }, blocked).ok).toBe(
      false,
    );
    const full = {
      getItem: () => null,
      setItem: () => {
        throw Error('full');
      },
    };
    expect(saveEnemyProject('enemy', createDefaultProject(), { expected: null }, full).ok).toBe(
      false,
    );
  });
  it('never writes if the current data cannot be read, even if writing would succeed', () => {
    let written = false;
    const s = {
      getItem: () => {
        throw Error('blocked');
      },
      setItem: () => {
        written = true;
      },
    };
    expect(saveEnemyProject('enemy', createDefaultProject(), { expected: null }, s).ok).toBe(false);
    expect(written).toBe(false);
  });
  it('rejects recursive drafts without overwriting a valid save', () => {
    const s = storage(),
      p = createDefaultProject();
    saveEnemyProject('enemy', p, { expected: null }, s);
    const before = s.getItem(projectKey('enemy'))!;
    p.tabs[1].workspace.blocks.blocks[0].inputs = {
      BODY: {
        block: {
          id: 'self-call',
          type: 'df_call',
          extraState: { tacticId: 'capture', arguments: [{ parameterId: 'kind', type: 'query' }] },
          inputs: {
            ARG_kind: {
              shadow: { id: 'self-kind', type: 'df_query', fields: { VALUE: 'neutral' } },
            },
          },
        },
      },
    };
    const result = saveEnemyProject('enemy', p, { expected: before }, s);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics!.some((d) => d.code === 'recursion')).toBe(true);
    expect(s.getItem(projectKey('enemy'))).toBe(before);
  });
  it('does not trust structurally valid but semantically invalid stored source', () => {
    const s = storage(),
      p = createDefaultProject();
    p.tabs[1].workspace.blocks.blocks[0].inputs = {};
    s.setItem(projectKey('enemy'), JSON.stringify(p));
    expect(readEnemyProject('enemy', s).recovery).toBe(true);
  });
});
