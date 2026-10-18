import type { serialization } from 'blockly/core';

export const PROJECT_VERSION = 1;
export const BLOCKLY_VERSION = '13.4.0';
export const PROCEDURES_VERSION = '13.4.0';
export const SCALAR_TYPES = ['query', 'ranking', 'army', 'attempts', 'horizon'] as const;
export type ScalarType = typeof SCALAR_TYPES[number];
export const SLOT_KINDS = ['city', 'source-list', 'chosen-set', 'capture-plan'] as const;
export type SlotKind = typeof SLOT_KINDS[number];
export interface SlotDeclaration { id: string; name: string; kind: SlotKind }
export interface ParameterState extends serialization.procedures.ParameterState { id: string; name: string; types: [ScalarType] }
export interface TacticState extends serialization.procedures.State {
  id: string;
  name: string;
  returnTypes: null;
  parameters: ParameterState[];
}
export interface ArgumentShape { parameterId: string; type: ScalarType }
export interface CallState { tacticId: string; arguments: ArgumentShape[] }
export interface ParameterReference { parameterId: string; type: ScalarType }
export type BlockState = serialization.blocks.State;
export interface WorkspaceState { blocks: { languageVersion: 0; blocks: BlockState[] } }
export interface ProjectTab {
  id: string; // 'main' or the stable tactic identity, never its display name.
  slots: SlotDeclaration[];
  workspace: WorkspaceState;
}
/** Editable Blockly source only. No generated runtime program or MDSL is stored here. */
export interface BotProject {
  format: 'dotfield-bot';
  version: typeof PROJECT_VERSION;
  blocklyVersion: typeof BLOCKLY_VERSION;
  proceduresVersion: typeof PROCEDURES_VERSION;
  procedures: TacticState[];
  tabs: ProjectTab[];
  editor: { activeTab: string };
}
/** Parsing/authoring guards, NOT a declaration that synchronous runtime execution is safe. */
export const SOURCE_LIMITS = { bytes: 256 * 1024, blocks: 128, depth: 12, tactics: 8, parameters: 4, slots: 16 } as const;
export const scalarCheck = (type: ScalarType) => `dotfield:${type}`;
export const STEP_CHECK = 'dotfield:step';
