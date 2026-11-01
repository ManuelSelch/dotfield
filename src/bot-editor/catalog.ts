import type { ScalarType, SlotKind } from './types';

export const SCALARS: Record<
  ScalarType,
  { label: string; values?: string[]; min?: number; max?: number; default: string | number }
> = {
  query: { label: 'target class', values: ['neutral', 'enemy'], default: 'neutral' },
  ranking: { label: 'ranking', values: ['nearest-reachable'], default: 'nearest-reachable' },
  army: { label: 'minimum army', min: 1, max: 999, default: 6 },
  attempts: { label: 'retry attempts', min: 1, max: 8, default: 4 },
  // Preserve the existing prototype domain. A stricter runtime admission policy
  // must be explicit; it must never silently clamp a saved project on load.
  horizon: { label: 'forecast ms', min: 1, max: 60000, default: 15000 },
};
export interface BlockSpec {
  label: string;
  colour: string;
  inputs?: Record<string, ScalarType | 'body'>;
  slots?: Record<string, SlotKind>;
  cleanup?: boolean;
}
export const CATALOG: Record<string, BlockSpec> = {
  df_selector: { label: 'Try branches in order', colour: '#ac7b32', inputs: { BODY: 'body' } },
  df_sequence: {
    label: 'Sequence',
    colour: '#ac7b32',
    inputs: { BODY: 'body' },
    slots: { PLAN: 'capture-plan' },
    cleanup: true,
  },
  df_retry: { label: 'Retry', colour: '#ac7b32', inputs: { ATTEMPTS: 'attempts', BODY: 'body' } },
  df_select_city: {
    label: 'Select city',
    colour: '#4c8260',
    inputs: { QUERY: 'query', RANKING: 'ranking' },
    slots: { TARGET: 'city' },
  },
  df_select_sources: {
    label: 'Select sources',
    colour: '#4c8260',
    inputs: { MINIMUM: 'army' },
    slots: { TARGET: 'city', OUTPUT: 'source-list' },
  },
  df_next_city: {
    label: 'Next city',
    colour: '#4c8260',
    slots: { LIST: 'source-list', OUTPUT: 'city' },
  },
  df_clear_set: { label: 'Clear set', colour: '#4c8260', slots: { SET: 'chosen-set' } },
  df_add_to_set: {
    label: 'Add city to set',
    colour: '#4c8260',
    slots: { SET: 'chosen-set', CITY: 'city' },
  },
  df_plan_capture: {
    label: 'Plan exact capture',
    colour: '#4c7f9c',
    inputs: { HORIZON: 'horizon' },
    slots: { TARGET: 'city', SOURCES: 'chosen-set', PLAN: 'capture-plan' },
  },
  df_execute_plan: {
    label: 'Execute plan · RUNNING until finished',
    colour: '#4c7f9c',
    slots: { PLAN: 'capture-plan' },
  },
};
export const BLOCK_TYPES = new Set([
  ...Object.keys(CATALOG),
  ...Object.keys(SCALARS).map((t) => `df_${t}`),
  'df_main',
  'df_tactic',
  'df_call',
  'df_parameter',
]);
