import type { RootNodeDefinition } from 'mistreevous/dist/BehaviourTreeDefinition';

export type MemoryKind = 'city' | 'source-list' | 'chosen-set' | 'capture-plan';
type SlotArgument = { slot: MemoryKind; access: 'read' | 'write' | 'readwrite' };
export type ArgumentSpec = SlotArgument | 'query' | 'ranking' | 'minimum' | 'horizon';
export const ACTIONS: Record<string, readonly ArgumentSpec[]> = {
  SelectCity: ['query', 'ranking', { slot: 'city', access: 'write' }],
  SelectSources: [
    { slot: 'city', access: 'read' },
    'minimum',
    { slot: 'source-list', access: 'write' },
  ],
  NextCity: [
    { slot: 'source-list', access: 'read' },
    { slot: 'city', access: 'write' },
  ],
  ClearSet: [{ slot: 'chosen-set', access: 'write' }],
  AddToSet: [
    { slot: 'chosen-set', access: 'readwrite' },
    { slot: 'city', access: 'read' },
  ],
  PlanCapture: [
    { slot: 'city', access: 'read' },
    { slot: 'chosen-set', access: 'read' },
    'horizon',
    { slot: 'capture-plan', access: 'write' },
  ],
  ExecutePlan: [{ slot: 'capture-plan', access: 'read' }],
};
export interface NodeOrigin {
  tabId: string;
  blockId: string;
  callPath: string[];
}
export interface CompiledProgram {
  definition: RootNodeDefinition;
  origins: Record<string, NodeOrigin>;
}
export interface ProgramIssue {
  path: string;
  code: string;
  message: string;
}
