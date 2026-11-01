import { createDefaultProject } from '@/bot-editor/default-project';
import type { BlockState, BotProject } from '@/bot-editor/types';

/** Source fixture for two definitions and nested scalar forwarding; not a runtime AST. */
export function forwardingProject(): BotProject {
  const project = createDefaultProject();
  project.procedures.push({
    id: 'wrapper',
    name: 'Capture nearby',
    returnTypes: null,
    parameters: [
      { id: 'target-kind', name: 'which', types: ['query'] },
      { id: 'budget', name: 'budget', types: ['attempts'] },
    ],
  });
  project.tabs.push({
    id: 'wrapper',
    slots: [],
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            id: 'wrapper-entry',
            type: 'df_tactic',
            x: 36,
            y: 48,
            extraState: { tacticId: 'wrapper' },
            inputs: {
              BODY: {
                block: {
                  id: 'forwarded-call',
                  type: 'df_call',
                  extraState: {
                    tacticId: 'capture',
                    arguments: [{ parameterId: 'kind', type: 'query' }],
                  },
                  inputs: {
                    ARG_kind: {
                      block: {
                        id: 'forwarded-kind',
                        type: 'df_parameter',
                        extraState: { parameterId: 'target-kind', type: 'query' },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    },
  });
  const mainCall =
    project.tabs[0].workspace.blocks.blocks[0].inputs!.BODY.block!.inputs!.BODY.block!;
  mainCall.extraState = {
    tacticId: 'wrapper',
    arguments: [
      { parameterId: 'target-kind', type: 'query' },
      { parameterId: 'budget', type: 'attempts' },
    ],
  };
  mainCall.inputs = {
    'ARG_target-kind': {
      shadow: { id: 'wrapper-neutral', type: 'df_query', fields: { VALUE: 'neutral' } },
    },
    ARG_budget: { shadow: { id: 'wrapper-budget', type: 'df_attempts', fields: { VALUE: 3 } } },
  };
  // A declared forwarded numeric input in a normal typed field as well as a call.
  const body = project.tabs[2].workspace.blocks.blocks[0].inputs!.BODY.block!;
  const retry: BlockState = {
    id: 'wrapper-retry',
    type: 'df_retry',
    inputs: {
      ATTEMPTS: {
        block: {
          id: 'forwarded-budget',
          type: 'df_parameter',
          extraState: { parameterId: 'budget', type: 'attempts' },
        },
      },
      BODY: { block: body },
    },
  };
  project.tabs[2].workspace.blocks.blocks[0].inputs!.BODY = { block: retry };
  return project;
}
