import { Modal } from '@mantine/core';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { EditorCanvas } from './canvas';
import { compileProject, type CompilerDiagnostic } from './compiler';
import { createDefaultProject } from './default-project';
import { DraftHistory, allBlocks, editProject, findBlock } from './editing';
import { StepControls, type Edit } from './step-controls';
import { readEnemyProject, saveEnemyProject } from './storage';
import { TacticControls } from './tactic-controls';
import './editor.css';

export default function BotEditor({
  enemy,
  name,
  onClose,
}: {
  enemy: string;
  name: string;
  onClose: () => void;
}) {
  const [stored, setStored] = useState(() => readEnemyProject(enemy));
  const history = useRef<DraftHistory | null>(null);
  if (!history.current)
    history.current = new DraftHistory(stored.project ?? createDefaultProject());
  const h = history.current;
  const [revision, setRevision] = useState(0),
    [generation, setGeneration] = useState(0),
    [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(
    h.current.tabs.find((t) => t.id === h.current.editor.activeTab)!.workspace.blocks.blocks[0].id!,
  );
  const [error, setError] = useState(stored.error ?? ''),
    [status, setStatus] = useState('Draft only · custom gameplay is not enabled.');
  const [diagnostics, setDiagnostics] = useState<CompilerDiagnostic[]>([]);
  const [confirm, setConfirm] = useState<'discard' | 'replace' | null>(null);
  const [replaceUnreadable, setReplaceUnreadable] = useState(false);
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorCanvas | null>(null);
  const [sourceInvalid, setSourceInvalid] = useState(false);
  const invalidRef = useRef(false),
    selectedRef = useRef(selected);
  selectedRef.current = selected;
  const invalid = (e: unknown) => {
    invalidRef.current = true;
    setSourceInvalid(true);
    fail(e);
  };
  const refresh = () => setRevision((n) => n + 1);
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));
  const flush = () => view.current?.flush();
  const select = (id: string) => {
    setSelected(id);
    view.current?.select(id);
  };
  const apply = (command: () => void) => {
    try {
      flush();
      command();
      setDiagnostics([]);
      setError('');
      setStatus('Draft changed · Save applies to future custom matches only.');
      setGeneration((n) => n + 1);
      refresh();
    } catch (e) {
      fail(e);
    }
  };
  const edit: Edit = (command, id) =>
    apply(() => {
      h.record(editProject(h.current, command));
      const activeIds = new Set(allBlocks(h.current, h.current.editor.activeTab).map((b) => b.id));
      const found =
        id && activeIds.has(id)
          ? id
          : activeIds.has(selectedRef.current)
            ? selectedRef.current
            : h.current.tabs.find((t) => t.id === h.current.editor.activeTab)!.workspace.blocks
                .blocks[0].id!;
      setSelected(found);
    });
  const undo = (redo = false) => {
    try {
      flush();
    } catch {
      // An invalid rendered edit (e.g. native duplication beyond the source
      // cap) was never admitted to history. Undo explicitly restores its last
      // editable snapshot instead of trapping the player behind failed Save.
      invalidRef.current = false;
      setSourceInvalid(false);
      setGeneration((n) => n + 1);
      setError('Restored the last editable draft. The saved project is unchanged.');
      return;
    }
    apply(() => {
      if (redo) h.redo();
      else h.undo();
      if (!findBlock(h.current, selectedRef.current))
        setSelected(
          h.current.tabs.find((t) => t.id === h.current.editor.activeTab)!.workspace.blocks
            .blocks[0].id!,
        );
    });
  };
  useLayoutEffect(() => {
    const container = host.current!;
    let canvas: EditorCanvas | undefined;
    try {
      canvas = new EditorCanvas(
        container,
        h.current,
        (p) => {
          try {
            h.record(p);
            invalidRef.current = false;
            setSourceInvalid(false);
            refresh();
          } catch (e) {
            invalid(e);
          }
        },
        setSelected,
        (redo) => undo(redo),
        invalid,
      );
      view.current = canvas;
      // Canonicalize Blockly's serialization once without declaring a freshly
      // opened saved project dirty merely because JSON property order changed.
      if (generation === 0) h.canonicalizeInitial(canvas.session.save());
      setReady(true);
      canvas.select(
        findBlock(h.current, selected)
          ? selected
          : h.current.tabs.find((t) => t.id === h.current.editor.activeTab)!.workspace.blocks
              .blocks[0].id!,
      );
      refresh();
      return () => {
        view.current = null;
        canvas!.dispose();
      };
    } catch (e) {
      view.current = null;
      canvas?.dispose();
      setReady(false);
      container.replaceChildren();
      fail(e);
    }
    // A source transaction replaces all workspaces/models together. Ordinary
    // SVG changes update history without remounting the focused canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation]);
  // Callbacks in the mounted canvas must always see the current history object.
  // Initial normalization changes its contents, not its ownership.
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      try {
        view.current?.flush();
      } catch {
        invalidRef.current = true;
      }
      if (history.current!.dirty || invalidRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, []);
  function switchTab(id: string) {
    try {
      flush();
      h.selectTab(id);
      view.current?.show(id);
      const root = h.current.tabs.find((t) => t.id === id)!.workspace.blocks.blocks[0];
      select(root.id!);
      refresh();
    } catch (e) {
      fail(e);
    }
  }
  function save() {
    try {
      flush();
      const result = saveEnemyProject(enemy, h.current, {
        expected: stored.token,
        replaceUnreadable,
      });
      if (!result.ok) {
        setError(result.error);
        setDiagnostics(result.diagnostics ?? []);
        return;
      }
      h.markSaved();
      setStored({ project: result.project, token: result.token, recovery: false });
      setReplaceUnreadable(false);
      setError('');
      setDiagnostics([]);
      setStatus('Saved locally · Normal AI is unchanged. Custom activation is not enabled yet.');
      refresh();
    } catch (e) {
      invalid(e);
    }
  }
  const p = h.current;
  return (
    <section
      className="bot-editor"
      aria-label={`${name} logic editor`}
      onKeyDownCapture={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          e.stopPropagation();
          undo(e.shiftKey);
        }
      }}
      data-revision={revision}
    >
      <header className="bot-editor-heading">
        <div>
          <span className="bot-caption">Enemy strategy</span>
          <h1>{name} logic</h1>
        </div>
        <span>{h.dirty || sourceInvalid ? 'Unsaved changes' : 'Local draft'}</span>
      </header>
      <p className="bot-explainer">
        Try branches in order. A RUNNING plan keeps its branch until it finishes. Edits never change
        a running match. Custom gameplay is unavailable until match integration.
      </p>
      <nav className="bot-tabs" aria-label="Scripts">
        {p.tabs.map((t) => (
          <button
            type="button"
            key={t.id}
            aria-pressed={p.editor.activeTab === t.id}
            onClick={() => switchTab(t.id)}
          >
            {t.id === 'main' ? 'Main' : p.procedures.find((a) => a.id === t.id)!.name}
          </button>
        ))}
      </nav>
      <TacticControls
        project={p}
        edit={edit}
        replace={(command) => apply(() => h.record(command(h.current)))}
      />
      <div className="bot-workarea">
        <StepControls
          project={p}
          selected={selected}
          select={select}
          edit={edit}
          error={setError}
        />
        {/* Blockly owns keyboard interaction inside this focusable workspace host. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div ref={host} className="bot-canvas" aria-label="Blockly workspace" tabIndex={0} />
      </div>
      <div className="bot-button-row">
        <button type="button" disabled={!h.canUndo && !sourceInvalid} onClick={() => undo()}>
          Undo
        </button>
        <button type="button" disabled={!h.canRedo} onClick={() => undo(true)}>
          Redo
        </button>
        <button
          type="button"
          onClick={() =>
            apply(() => {
              h.record(createDefaultProject());
              setSelected('main-entry');
            })
          }
        >
          Reset draft
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              flush();
              const result = compileProject(h.current);
              setDiagnostics(result.ok ? [] : result.diagnostics);
              setError(result.ok ? '' : 'Fix the draft errors before saving.');
              setStatus(
                result.ok ? 'Draft checks passed · not saved yet.' : 'Draft needs attention.',
              );
            } catch (e) {
              fail(e);
            }
          }}
        >
          Check draft
        </button>
      </div>
      <p className="bot-caption">
        Reset changes only this draft. Save is explicit. Forecast admission: at most15000ms. Slot
        memory is private to each call.
      </p>
      {(error || diagnostics.length > 0) && (
        <div className="bot-errors" role="alert">
          {error}
          {diagnostics.length > 0 && (
            <ul>
              {diagnostics.slice(0, 20).map((d, i) => (
                <li key={i}>
                  {d.message}{' '}
                  {d.blockId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (d.tabId) switchTab(d.tabId);
                        select(d.blockId!);
                      }}
                    >
                      Show block
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {stored.recovery && !replaceUnreadable && (
        <button type="button" onClick={() => setConfirm('replace')}>
          Replace unreadable save
        </button>
      )}
      {replaceUnreadable && (
        <p>
          Replacement confirmed. Save will replace the unreadable project; Back still leaves it
          untouched.
        </p>
      )}
      <p role="status" aria-label="Editor status">
        {status}
      </p>
      <footer className="bot-editor-footer">
        <button
          type="button"
          onClick={() => {
            try {
              flush();
              if (h.dirty) setConfirm('discard');
              else onClose();
            } catch (e) {
              fail(e);
              setConfirm('discard');
            }
          }}
        >
          Back to Home
        </button>
        <button className="bot-save" type="button" disabled={!ready} onClick={save}>
          Save
        </button>
      </footer>
      <Modal
        opened={confirm !== null}
        onClose={() => setConfirm(null)}
        title={
          confirm === 'discard' ? 'Discard unsaved changes?' : 'Replace unreadable saved project?'
        }
        centered
      >
        <p>
          {confirm === 'discard'
            ? 'Your last saved project stays unchanged.'
            : 'This explicitly permits replacing the unsupported/corrupt project on your next Save. Nothing is replaced now.'}
        </p>
        <div className="bot-confirm-actions">
          <button type="button" onClick={() => setConfirm(null)}>
            {confirm === 'discard' ? 'Keep editing' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm === 'discard') onClose();
              else {
                setReplaceUnreadable(true);
                setConfirm(null);
              }
            }}
          >
            {confirm === 'discard' ? 'Discard changes' : 'Confirm replacement'}
          </button>
        </div>
      </Modal>
      <p className="bot-license">
        Built with Blockly / Zelos.{' '}
        <a href="/licenses/BLOCKLY-LICENSE.txt" target="_blank" rel="noreferrer">
          Blockly license
        </a>{' '}
        ·{' '}
        <a href="/licenses/SHAREABLE-PROCEDURES-LICENSE.txt" target="_blank" rel="noreferrer">
          Procedure model license
        </a>{' '}
        (Apache-2.0).
      </p>
    </section>
  );
}
