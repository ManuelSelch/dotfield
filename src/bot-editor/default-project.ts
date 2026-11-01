import { BLOCKLY_VERSION, PROCEDURES_VERSION, PROJECT_VERSION } from './types';
import type { BlockState, BotProject, SlotDeclaration } from './types';

const slots = (): SlotDeclaration[] => [
  { id: 'target', name: 'target', kind: 'city' },
  { id: 'sources', name: 'sources', kind: 'source-list' },
  { id: 'source', name: 'source', kind: 'city' },
  { id: 'chosen', name: 'chosen', kind: 'chosen-set' },
  { id: 'plan', name: 'plan', kind: 'capture-plan' },
];
const chain = (...blocks: BlockState[]): BlockState =>
  blocks.reduceRight((next, b) => ({ ...b, ...(next ? { next: { block: next } } : {}) }));
const literal = (id: string, type: string, value: string | number) => ({
  shadow: { id, type: `df_${type}`, fields: { VALUE: value } },
});
const call = (id: string, query: string): BlockState => ({
  id,
  type: 'df_call',
  extraState: { tacticId: 'capture', arguments: [{ parameterId: 'kind', type: 'query' }] },
  inputs: { ARG_kind: literal(`${id}-kind`, 'query', query) },
});
const b = (
  id: string,
  type: string,
  fields: Record<string, string> = {},
  inputs?: BlockState['inputs'],
): BlockState => ({ id, type: `df_${type}`, fields, ...(inputs ? { inputs } : {}) });
const workspace = (root: BlockState) => ({
  blocks: { languageVersion: 0 as const, blocks: [{ ...root, x: 24, y: 24 }] },
});

/** Fresh deterministic editable source; compilation allocates private call-site slots. */
export function createDefaultProject(): BotProject {
  return {
    format: 'dotfield-bot',
    version: PROJECT_VERSION,
    blocklyVersion: BLOCKLY_VERSION,
    proceduresVersion: PROCEDURES_VERSION,
    procedures: [
      {
        id: 'capture',
        name: 'Capture',
        returnTypes: null,
        parameters: [{ id: 'kind', name: 'kind', types: ['query'] }],
      },
    ],
    tabs: [
      {
        id: 'main',
        slots: slots(),
        workspace: workspace(
          b(
            'main-entry',
            'main',
            {},
            {
              BODY: {
                block: b(
                  'main-priority',
                  'selector',
                  {},
                  {
                    BODY: {
                      block: chain(call('neutral-call', 'neutral'), call('enemy-call', 'enemy')),
                    },
                  },
                ),
              },
            },
          ),
        ),
      },
      {
        id: 'capture',
        slots: slots(),
        workspace: workspace({
          id: 'capture-entry',
          type: 'df_tactic',
          extraState: { tacticId: 'capture' },
          inputs: {
            BODY: {
              block: b(
                'capture-body',
                'sequence',
                { CLEANUP: 'release-plan', PLAN: 'plan' },
                {
                  BODY: {
                    block: chain(
                      b(
                        'select-target',
                        'select_city',
                        { TARGET: 'target' },
                        {
                          QUERY: {
                            block: {
                              id: 'kind-reference',
                              type: 'df_parameter',
                              extraState: { parameterId: 'kind', type: 'query' },
                            },
                          },
                          RANKING: literal('target-ranking', 'ranking', 'nearest-reachable'),
                        },
                      ),
                      b(
                        'select-sources',
                        'select_sources',
                        { TARGET: 'target', OUTPUT: 'sources' },
                        { MINIMUM: literal('minimum-army', 'army', 6) },
                      ),
                      b('clear-chosen', 'clear_set', { SET: 'chosen' }),
                      b(
                        'grow-source-set',
                        'retry',
                        {},
                        {
                          ATTEMPTS: literal('source-limit', 'attempts', 4),
                          BODY: {
                            block: b(
                              'attempt-capture',
                              'sequence',
                              { CLEANUP: 'none', PLAN: 'plan' },
                              {
                                BODY: {
                                  block: chain(
                                    b('next-source', 'next_city', {
                                      LIST: 'sources',
                                      OUTPUT: 'source',
                                    }),
                                    b('choose-source', 'add_to_set', {
                                      SET: 'chosen',
                                      CITY: 'source',
                                    }),
                                    b(
                                      'forecast',
                                      'plan_capture',
                                      { TARGET: 'target', SOURCES: 'chosen', PLAN: 'plan' },
                                      { HORIZON: literal('capture-horizon', 'horizon', 15000) },
                                    ),
                                  ),
                                },
                              },
                            ),
                          },
                        },
                      ),
                      b('execute', 'execute_plan', { PLAN: 'plan' }),
                    ),
                  },
                },
              ),
            },
          },
        }),
      },
    ],
    editor: { activeTab: 'main' },
  };
}
