import { useState } from 'react';

import { changeSignature as applySignature, createTactic, deleteTactic } from './editing';
import type { Edit } from './step-controls';
import { SCALAR_TYPES, SOURCE_LIMITS, type BotProject, type ScalarType } from './types';
const changeSignature =
  (...args: Parameters<typeof applySignature>) =>
  (current: BotProject) =>
    applySignature(current, args[1], args[2]);
export function TacticControls({
  project: p,
  edit,
  replace,
}: {
  project: BotProject;
  edit: Edit;
  replace: (command: (p: BotProject) => BotProject) => void;
}) {
  const [name, setName] = useState('');
  const tactic = p.procedures.find((t) => t.id === p.editor.activeTab);
  const params = tactic?.parameters ?? [];
  return (
    <details className="bot-tactics">
      <summary>Tactics and inputs</summary>
      <form
        className="bot-button-row"
        onSubmit={(e) => {
          e.preventDefault();
          edit((d) => createTactic(d, name));
        }}
      >
        <label>
          New tactic name
          <input
            aria-label="New tactic name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={p.procedures.length >= SOURCE_LIMITS.tactics}>
          Create tactic
        </button>
      </form>
      {tactic ? (
        <>
          <label>
            Tactic name
            <input
              aria-label="Tactic name"
              maxLength={80}
              value={tactic.name}
              onChange={(e) =>
                edit((d) => {
                  d.procedures.find((t) => t.id === tactic.id)!.name = e.target.value;
                })
              }
            />
          </label>
          <button type="button" onClick={() => edit((d) => deleteTactic(d, tactic.id))}>
            Delete tactic
          </button>
          <p>
            Shared body. Signature changes keep old arguments until you explicitly resolve them.
          </p>
          {params.map((param, index) => (
            <div className="bot-signature-input" key={param.id}>
              <label>
                Input name
                <input
                  aria-label={`${param.name} input name`}
                  maxLength={80}
                  value={param.name}
                  onChange={(e) =>
                    replace(
                      changeSignature(
                        p,
                        tactic.id,
                        params.map((a) => (a.id === param.id ? { ...a, name: e.target.value } : a)),
                      ),
                    )
                  }
                />
              </label>
              <label>
                Input type
                <select
                  aria-label={`${param.name} type`}
                  value={param.types[0]}
                  onChange={(e) =>
                    replace(
                      changeSignature(
                        p,
                        tactic.id,
                        params.map((a) =>
                          a.id === param.id ? { ...a, types: [e.target.value as ScalarType] } : a,
                        ),
                      ),
                    )
                  }
                >
                  {SCALAR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={index === 0}
                aria-label={`Move input ${param.name} up`}
                onClick={() => {
                  const next = [...params];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  replace(changeSignature(p, tactic.id, next));
                }}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === params.length - 1}
                aria-label={`Move input ${param.name} down`}
                onClick={() => {
                  const next = [...params];
                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  replace(changeSignature(p, tactic.id, next));
                }}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Remove input ${param.name}`}
                onClick={() =>
                  replace(
                    changeSignature(
                      p,
                      tactic.id,
                      params.filter((a) => a.id !== param.id),
                    ),
                  )
                }
              >
                Remove input
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={params.length >= SOURCE_LIMITS.parameters}
            onClick={() => {
              let n = 1;
              while (params.some((a) => a.name === `input${n}`)) n++;
              replace(
                changeSignature(p, tactic.id, [
                  ...params,
                  { id: crypto.randomUUID(), name: `input${n}`, types: ['query'] },
                ]),
              );
            }}
          >
            Add input
          </button>
        </>
      ) : (
        <p>Select a tactic tab to edit its shared name and inputs. Main has no parameters.</p>
      )}
    </details>
  );
}
