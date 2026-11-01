import { createDefaultProject } from '@/bot-editor/default-project';
import type { BlockState, BotProject } from '@/bot-editor/types';

/** Compact DAG fixture; fanout is shared source, not already expanded nodes. */
export function callGraphProject(levels: number, fanout: number, nesting = 0): BotProject {
  const p = createDefaultProject();
  p.procedures = [];
  p.tabs = [p.tabs[0]];
  p.tabs[0].workspace.blocks.blocks[0].inputs = {
    BODY: {
      block: { id: 'entry-call', type: 'df_call', extraState: { tacticId: 't0', arguments: [] } },
    },
  };
  for (let level = 0; level < levels; level++) {
    const id = `t${level}`;
    p.procedures.push({ id, name: id, returnTypes: null, parameters: [] });
    let body: BlockState;
    if (level === levels - 1)
      body = { id: `${id}-clear`, type: 'df_clear_set', fields: { SET: 'chosen' } };
    else {
      const calls: BlockState[] = Array.from({ length: fanout }, (_, i) => ({
        id: `${id}-call-${i}`,
        type: 'df_call',
        extraState: { tacticId: `t${level + 1}`, arguments: [] },
      }));
      body = calls.reduceRight((next, b) => ({ ...b, ...(next ? { next: { block: next } } : {}) }));
    }
    for (let n = 0; n < nesting; n++)
      body = { id: `${id}-nest-${n}`, type: 'df_selector', inputs: { BODY: { block: body } } };
    p.tabs.push({
      id,
      slots: [{ id: 'chosen', name: 'chosen', kind: 'chosen-set' }],
      workspace: {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              id: `${id}-entry`,
              type: 'df_tactic',
              extraState: { tacticId: id },
              inputs: { BODY: { block: body } },
            },
          ],
        },
      },
    });
  }
  return p;
}
