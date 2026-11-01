import * as Blockly from 'blockly/core';

import { loadProject } from './project';
import type { BotProject } from './types';
const theme = Blockly.Theme.defineTheme('dotfield', {
  name: 'dotfield',
  base: Blockly.Themes.Classic,
  fontStyle: { family: 'system-ui, sans-serif', weight: '500', size: 11 },
  componentStyles: {
    workspaceBackgroundColour: '#fcfdf8',
    insertionMarkerColour: '#315c42',
    insertionMarkerOpacity: 0.4,
  },
});
/** All SVG workspaces share project models, but never share them with another
 * editor session. Own every listener, observer, pending callback and canvas.
 */
export class EditorCanvas {
  readonly session!: ReturnType<typeof loadProject>;
  private panes = new Map<string, HTMLDivElement>();
  private observer?: ResizeObserver;
  private listeners = new Map<Blockly.Workspace, (event: Blockly.Events.Abstract) => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private active: string;
  constructor(
    private host: HTMLElement,
    p: BotProject,
    private change: (p: BotProject) => void,
    private selection: (id: string) => void,
    history: (redo: boolean) => void,
    private fault: (error: unknown) => void,
  ) {
    this.active = p.editor.activeTab;
    try {
      this.session = loadProject(p, (tab) => {
        const pane = document.createElement('div');
        pane.className = 'bot-workspace';
        pane.hidden = tab.id !== this.active;
        this.panes.set(tab.id, pane);
        host.append(pane);
        return Blockly.inject(pane, {
          renderer: 'zelos',
          theme,
          media: '/blockly-media/',
          trashcan: true,
          scrollbars: true,
          move: { scrollbars: true, drag: true, wheel: true },
          zoom: { controls: true, wheel: false, startScale: 0.8, minScale: 0.3, maxScale: 1.4 },
          grid: { spacing: 22, length: 1, colour: '#dce4d7', snap: false },
          sounds: false,
          comments: false,
          disable: false,
        });
      });
      for (const [id, base] of this.session.workspaces) {
        const ws = base as Blockly.WorkspaceSvg;
        ws.MAX_UNDO = 0;
        ws.undo = (redo = false) => history(redo);
        for (const b of ws.getTopBlocks())
          if (b.type === 'df_main' || b.type === 'df_tactic') {
            b.setDeletable(false);
            b.setMovable(false);
          }
        const listener = (event: Blockly.Events.Abstract) => {
          if (this.disposed) return;
          if (event.type === Blockly.Events.SELECTED && this.active === id) {
            const selected = event as Blockly.Events.Selected;
            if (selected.newElementId) {
              let block = ws.getBlockById(selected.newElementId);
              while (block?.outputConnection && block.getParent()) block = block.getParent();
              if (block) this.selection(block.id);
            }
          }
          if (event.isUiEvent) return;
          if (this.timer) clearTimeout(this.timer);
          this.timer = setTimeout(() => {
            this.timer = undefined;
            try {
              this.flush();
            } catch (error) {
              this.fault(error);
            }
          }, 0);
        };
        ws.addChangeListener(listener);
        this.listeners.set(ws, listener);
      }
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(host);
      this.show(this.active);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.disposed) this.change(this.session.save());
  }
  show(id: string) {
    this.active = id;
    this.session.setActiveTab(id);
    for (const [tab, pane] of this.panes) {
      pane.hidden = tab !== id;
      const ws = this.session.workspaces.get(tab) as Blockly.WorkspaceSvg;
      ws.setVisible(tab === id);
      if (tab === id) ws.render();
    }
    this.resize();
  }
  select(id: string) {
    const b = this.session.workspaces.get(this.active)?.getBlockById(id) as
      Blockly.BlockSvg | undefined;
    b?.select();
  }
  private resize() {
    if (!this.disposed) {
      const ws = this.session.workspaces.get(this.active) as Blockly.WorkspaceSvg | undefined;
      if (ws) Blockly.svgResize(ws);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.observer?.disconnect();
    for (const [ws, listener] of this.listeners) ws.removeChangeListener(listener);
    this.listeners.clear();
    Blockly.DropDownDiv.hideWithoutAnimation();
    Blockly.WidgetDiv.hide();
    this.session?.dispose();
    this.panes.clear();
    this.host.replaceChildren();
  }
}
