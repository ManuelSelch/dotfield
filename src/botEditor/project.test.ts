import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly/core';
import { createDefaultProject } from './defaultProject';
import { loadProject, parseProject } from './project';
import { forwardingProject } from './fixtures/forwardingProject';

describe('visual bot project format', () => {
  it('round trips the default Main/Capture workspaces without changing identity or order', async () => {
    const project = createDefaultProject();
    const session = loadProject(project);
    try {
      const saved = session.save();
      const copy = loadProject(parseProject(JSON.stringify(saved)));
      try { expect(copy.save()).toEqual(saved); } finally { copy.dispose(); }
      expect(saved.procedures).toEqual(project.procedures);
      expect([...session.workspaces.keys()]).toEqual(['main', 'capture']);
      await expect(JSON.stringify(saved, null, 2) + '\n').toMatchFileSnapshot('./fixtures/default-project.json');
    } finally { session.dispose(); }
  });
  it('round trips named definitions, typed numeric inputs and nested parameter forwarding', async () => {
    const session = loadProject(forwardingProject());
    try {
      const wrapper = session.workspaces.get('wrapper')!;
      const forwarded = wrapper.getBlockById('forwarded-call')!;
      expect(forwarded.getInputTargetBlock('ARG_kind')!.saveExtraState!()).toEqual({ parameterId: 'target-kind', type: 'query' });
      expect(wrapper.getBlockById('wrapper-retry')!.getInputTargetBlock('ATTEMPTS')!.saveExtraState!()).toEqual({ parameterId: 'budget', type: 'attempts' });
      const saved = session.save(), restored = loadProject(saved);
      try { expect(restored.save()).toEqual(saved); } finally { restored.dispose(); }
      await expect(JSON.stringify(saved, null, 2) + '\n').toMatchFileSnapshot('./fixtures/forwarding-project.json');
    } finally { session.dispose(); }
  });
  it('rejects unsupported envelope and dependency versions before allocating a workspace', () => {
    expect(() => parseProject(JSON.stringify({ ...createDefaultProject(), version: 99 }))).toThrow(/version/i);
    expect(() => loadProject({ ...createDefaultProject(), blocklyVersion: '0.0.0' })).toThrow(/Blockly/i);
  });
  it('isolates project/session ownership, restores active tab and rejects use after disposal', () => {
    const input = createDefaultProject(), session = loadProject(input);
    input.procedures[0].name = 'mutated externally';
    session.setActiveTab('capture');
    const saved = session.save();saved.procedures[0].name = 'also external';
    expect(session.save().procedures[0].name).toBe('Capture');
    expect(session.save().editor.activeTab).toBe('capture');
    expect(() => session.setActiveTab('missing')).toThrow(/tab/);
    session.dispose(); session.dispose();
    expect(session.workspaces.size).toBe(0);expect(session.models.size).toBe(0);
    expect(() => session.save()).toThrow(/disposed/);
  });
  it('repeated headless load/dispose leaves no registered workspaces behind', () => {
    const before = Blockly.Workspace.getAll().map(w => w.id).sort();
    for (let i = 0; i < 10; i++) loadProject(createDefaultProject()).dispose();
    expect(Blockly.Workspace.getAll().map(w => w.id).sort()).toEqual(before);
    expect(() => loadProject({})).toThrow();
    expect(Blockly.Workspace.getAll().map(w => w.id).sort()).toEqual(before);
  });
  it('does not persist rendered entry protection flags as unsupported source properties', () => {
    const session=loadProject(createDefaultProject());
    try { const root=session.workspaces.get('main')!.getBlockById('main-entry')!;root.setDeletable(false);root.setMovable(false);
      const saved=session.save();expect(saved.tabs[0].workspace.blocks.blocks[0]).not.toHaveProperty('deletable');
      expect(saved.tabs[0].workspace.blocks.blocks[0]).not.toHaveProperty('movable');
    } finally {session.dispose();}
  });
  it('owns factory workspaces and cleans up partial construction failures', () => {
    const before=Blockly.Workspace.getAll().map(w=>w.id).sort();let calls=0;
    expect(()=>loadProject(createDefaultProject(),()=>{if(calls++)throw Error('mount failed');return new Blockly.Workspace();})).toThrow('mount failed');
    expect(Blockly.Workspace.getAll().map(w=>w.id).sort()).toEqual(before);
  });
  it('rejects malformed source instead of letting Blockly silently repair it', () => {
    expect(() => parseProject('{')).toThrow(/JSON/i);
    expect(() => parseProject('null')).toThrow(/project/i);
    const project = createDefaultProject();
    project.tabs[0].workspace.blocks.blocks[0].type = 'text_print';
    expect(() => loadProject(project)).toThrow(/block/i);
  });
});
