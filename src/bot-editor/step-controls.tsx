import { useState } from 'react';

import { CATALOG, SCALARS } from './catalog';
import {
  allBlocks,
  bindInput,
  findBlock,
  insertStep,
  moveInto,
  moveStep,
  removeStep,
} from './editing';
import type { BlockState, BotProject, ScalarType } from './types';
export type Edit = (command: (p: BotProject) => void, selected?: string) => void;
const child = (b: BlockState, input: string) =>
  b.inputs?.[input]?.block ?? b.inputs?.[input]?.shadow;
export function stepName(p: BotProject, b: BlockState): string {
  if (b.type === 'df_main') return 'Main';
  if (b.type === 'df_tactic')
    return `Define ${p.procedures.find((t) => t.id === b.extraState.tacticId)?.name ?? 'tactic'}`;
  if (b.type === 'df_call') {
    const t = p.procedures.find((t) => t.id === b.extraState.tacticId);
    return `Call ${t?.name ?? 'tactic'}(${t?.parameters
      .map((a) => {
        const v = child(b, `ARG_${a.id}`);
        return v?.type === 'df_parameter' ? 'input' : (v?.fields?.VALUE ?? '?');
      })
      .join(', ')})`;
  }
  if (b.type === 'df_parameter') return `Input reference ${b.extraState.parameterId}`;
  const scalar = Object.keys(SCALARS).find((type) => b.type === `df_${type}`) as
    ScalarType | undefined;
  return scalar
    ? `${SCALARS[scalar].label}: ${b.fields?.VALUE}`
    : (CATALOG[b.type]?.label ?? b.type);
}
export function StepControls({
  project: p,
  selected,
  select,
  edit,
  error,
}: {
  project: BotProject;
  selected: string;
  select: (id: string) => void;
  edit: Edit;
  error: (message: string) => void;
}) {
  const tab = p.tabs.find((t) => t.id === p.editor.activeTab)!;
  const blocks = allBlocks(p, tab.id).filter(
    (b) =>
      CATALOG[b.type] ||
      ['df_call', 'df_main', 'df_tactic'].includes(b.type) ||
      tab.workspace.blocks.blocks.some((root) => root.id === b.id),
  );
  const b = findBlock(p, selected),
    spec = b ? CATALOG[b.type] : undefined;
  const [destination, setDestination] = useState('');
  const [callee, setCallee] = useState('capture');
  const isEntry = b?.type === 'df_main' || b?.type === 'df_tactic';
  const inputs: { name: string; type: ScalarType; label: string }[] =
    b?.type === 'df_call'
      ? (p.procedures.find((t) => t.id === b.extraState.tacticId)?.parameters ?? []).map((a) => ({
          name: `ARG_${a.id}`,
          type: a.types[0],
          label: a.name,
        }))
      : Object.entries(spec?.inputs ?? {})
          .filter((entry): entry is [string, ScalarType] => entry[1] !== 'body')
          .map(([name, type]) => ({ name, type, label: SCALARS[type].label }));
  const enclosing = p.procedures.find((t) => t.id === tab.id);
  const groups = blocks.filter(
    (n) =>
      n.id !== selected &&
      (['df_main', 'df_tactic'].includes(n.type) || CATALOG[n.type]?.inputs?.BODY === 'body'),
  );
  const add = (type: string, tacticId?: string) => {
    const id = crypto.randomUUID();
    edit((d) => insertStep(d, tab.id, selected, type, id, tacticId), id);
  };
  return (
    <>
      <aside className="bot-library" aria-label="Block library">
        <span className="bot-caption">Library</span>
        {Object.entries(CATALOG).map(([type, s]) => (
          <button
            key={type}
            type="button"
            style={{ borderLeftColor: s.colour }}
            onClick={() => add(type)}
            aria-label={`Add ${s.label}`}
            disabled={!b || (!CATALOG[b.type] && !isEntry && b.type !== 'df_call')}
          >
            + {s.label}
          </button>
        ))}
        <label>
          Call tactic
          <select
            aria-label="Library tactic"
            value={p.procedures.some((t) => t.id === callee) ? callee : (p.procedures[0]?.id ?? '')}
            onChange={(e) => setCallee(e.target.value)}
          >
            {p.procedures.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!p.procedures.length}
          onClick={() =>
            add('df_call', p.procedures.some((t) => t.id === callee) ? callee : p.procedures[0]?.id)
          }
        >
          + Call tactic
        </button>
      </aside>
      <section className="bot-step-controls" aria-label="Tap and keyboard editing">
        <label>
          Selected step
          <select
            aria-label="Selected step"
            value={b?.id ?? ''}
            onChange={(e) => select(e.target.value)}
          >
            {blocks.map((n) => (
              <option key={n.id} value={n.id}>
                {stepName(p, n)}
              </option>
            ))}
          </select>
        </label>
        <div className="bot-button-row">
          <button
            type="button"
            disabled={!b || isEntry || !blocks.some((n) => n.next?.block?.id === b.id)}
            onClick={() => edit((d) => moveStep(d, selected, false))}
          >
            Move up
          </button>
          <button
            type="button"
            disabled={!b || isEntry || !b.next?.block}
            onClick={() => edit((d) => moveStep(d, selected, true))}
          >
            Move down
          </button>
          <button
            type="button"
            disabled={!b || isEntry}
            onClick={() => edit((d) => removeStep(d, selected), tab.workspace.blocks.blocks[0].id)}
          >
            Delete step
          </button>
        </div>
        <div className="bot-reparent">
          <label>
            Destination group
            <select
              aria-label="Destination group"
              value={groups.some((g) => g.id === destination) ? destination : (groups[0]?.id ?? '')}
              onChange={(e) => setDestination(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {stepName(p, g)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!b || isEntry || !groups.length}
            onClick={() =>
              edit((d) =>
                moveInto(
                  d,
                  selected,
                  groups.some((g) => g.id === destination) ? destination : groups[0].id!,
                ),
              )
            }
          >
            Move into group
          </button>
        </div>
        {spec?.cleanup && (
          <label>
            Cleanup
            <select
              aria-label="Cleanup"
              value={b!.fields!.CLEANUP}
              onChange={(e) =>
                edit((d) => {
                  findBlock(d, selected)!.fields!.CLEANUP = e.target.value;
                })
              }
            >
              <option value="none">None</option>
              <option value="release-plan">Release plan on success / failure / abort</option>
            </select>
          </label>
        )}
        {Object.entries(spec?.slots ?? {}).map(([field, kind]) => (
          <label key={field}>
            {field.toLowerCase()} · {kind}
            <select
              aria-label={`${field.toLowerCase()} ${kind} slot`}
              value={b!.fields![field]}
              onChange={(e) =>
                edit((d) => {
                  findBlock(d, selected)!.fields![field] = e.target.value;
                })
              }
            >
              {tab.slots
                .filter((s) => s.kind === kind)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
        ))}
        {b &&
          inputs.map(({ name, type, label }) => {
            const value = child(b, name),
              domain = SCALARS[type];
            const matching = value?.type === `df_${type}`;
            const ref =
              value?.type === 'df_parameter' &&
              value.extraState.type === type &&
              enclosing?.parameters.some(
                (a) => a.id === value.extraState.parameterId && a.types[0] === type,
              );
            const binding = matching
              ? 'literal'
              : ref
                ? `parameter:${value!.extraState.parameterId}`
                : '';
            return (
              <fieldset className="bot-input" key={`${b.id}-${name}`}>
                <legend>
                  {label} · {type}
                </legend>
                <label>
                  Binding
                  <select
                    aria-label={`${label} binding`}
                    value={binding}
                    onChange={(e) => {
                      const id = e.target.value.startsWith('parameter:')
                        ? e.target.value.slice(10)
                        : undefined;
                      edit((d) => bindInput(d, selected, name, type, domain.default, id));
                    }}
                  >
                    <option value="" disabled>
                      {value ? 'Incompatible input — replace explicitly' : 'Choose binding'}
                    </option>
                    <option value="literal">Literal</option>
                    {enclosing?.parameters
                      .filter((a) => a.types[0] === type)
                      .map((a) => (
                        <option key={a.id} value={`parameter:${a.id}`}>
                          Input: {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                {matching &&
                  (domain.values ? (
                    <label>
                      {domain.label}
                      <select
                        aria-label={`${domain.label} value`}
                        value={value.fields!.VALUE}
                        onChange={(e) =>
                          edit((d) => {
                            child(findBlock(d, selected)!, name)!.fields!.VALUE = e.target.value;
                          })
                        }
                      >
                        {domain.values.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      {domain.label}
                      <input
                        type="number"
                        aria-label={`${domain.label} value`}
                        min={domain.min}
                        max={domain.max}
                        step={1}
                        value={value.fields!.VALUE}
                        onChange={(e) => {
                          const n = e.target.valueAsNumber;
                          if (!Number.isInteger(n) || n < domain.min! || n > domain.max!) {
                            error(
                              `Enter a whole ${domain.label} value from ${domain.min} to ${domain.max}. The previous value is retained.`,
                            );
                            return;
                          }
                          edit((d) => {
                            child(findBlock(d, selected)!, name)!.fields!.VALUE = n;
                          });
                        }}
                      />
                    </label>
                  ))}
              </fieldset>
            );
          })}
        {b?.type === 'df_call' &&
          (b.extraState.arguments as { parameterId: string }[])
            .filter((a) => !inputs.some((i) => i.name === `ARG_${a.parameterId}`))
            .map((a) => (
              <button
                type="button"
                key={a.parameterId}
                onClick={() =>
                  edit((d) => {
                    const call = findBlock(d, selected)!;
                    call.extraState.arguments = call.extraState.arguments.filter(
                      (arg: { parameterId: string }) => arg.parameterId !== a.parameterId,
                    );
                    delete call.inputs?.[`ARG_${a.parameterId}`];
                  })
                }
              >
                Remove obsolete argument {a.parameterId}
              </button>
            ))}
      </section>
    </>
  );
}
