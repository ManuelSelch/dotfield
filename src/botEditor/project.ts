import * as Blockly from 'blockly/core';
import { setBlockContext, registerBotBlocks } from './blocks';
import { cloneProject } from './format';
import { TacticModel, TacticParameter } from './models';
import type { BotProject, WorkspaceState } from './types';
export { parseProject } from './format';

/** Headless workspace/model ownership. No React, storage, MDSL or game imports. */
class ProjectSession {
  readonly workspaces = new Map<string, Blockly.Workspace>();
  readonly models = new Map<string, TacticModel>();
  private disposed = false;
  private activeTab: string;
  constructor(private readonly source: BotProject, factory: (tab: BotProject['tabs'][number]) => Blockly.Workspace = () => new Blockly.Workspace()) {
    registerBotBlocks();
    this.activeTab = source.editor.activeTab;
    try {
      for (const tab of source.tabs) this.workspaces.set(tab.id, factory(tab));
      const main = this.workspaces.get('main')!;
      for (const state of source.procedures) {
        const model = Blockly.serialization.procedures.loadProcedure(TacticModel, TacticParameter, state, main);
        this.models.set(model.getId(), model);
      }
      // One shared backing model per identity. Workspace block state does not
      // duplicate signatures; the envelope stores models once for all tabs.
      for (const tab of source.tabs) {
        const workspace = this.workspaces.get(tab.id)!;
        setBlockContext(workspace, { tab, models: this.models });
        for (const model of this.models.values()) { model.attach(workspace); workspace.getProcedureMap().add(model); }
        for (const block of tab.workspace.blocks.blocks) Blockly.serialization.blocks.append(block, workspace);
      }
      for (const model of this.models.values()) model.notify();
    } catch (error) { this.dispose(); throw error; }
  }
  setActiveTab(id: string) {
    this.assertOpen();
    if (!this.workspaces.has(id)) throw new Error('Unknown editor tab.');
    this.activeTab = id;
  }
  save(): BotProject {
    this.assertOpen();
    const blockSerializer = new Blockly.serialization.blocks.BlockSerializer();
    const project: BotProject = {
      ...this.source,
      procedures: [...this.models.values()].map(m => m.saveState()),
      tabs: this.source.tabs.map(tab => {
        const blocks = blockSerializer.save(this.workspaces.get(tab.id)!) ?? { languageVersion: 0, blocks: [] };
        // Rendered entry protection is an editor invariant, not player source.
        for (const root of blocks.blocks) if (root.type === 'df_main' || root.type === 'df_tactic') {
          delete root.deletable; delete root.movable;
        }
        return { ...tab, workspace: { blocks } as WorkspaceState };
      }),
      editor: { activeTab: this.activeTab },
    };
    return cloneProject(project);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const workspace of this.workspaces.values()) {
      for (const model of this.models.values()) model.detach(workspace);
      workspace.dispose();
    }
    this.workspaces.clear(); this.models.clear();
  }
  private assertOpen() { if (this.disposed) throw new Error('Project session is disposed.'); }
}
export function loadProject(value: unknown, factory?: (tab: BotProject['tabs'][number]) => Blockly.Workspace): ProjectSession {
  // Validate the cloned envelope before allocating/connecting any Blockly data.
  return new ProjectSession(cloneProject(value), factory);
}
