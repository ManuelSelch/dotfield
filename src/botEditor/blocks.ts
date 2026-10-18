import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en';
import { CATALOG, SCALARS } from './catalog';
import { scalarCheck, STEP_CHECK } from './types';
import type { ArgumentShape, CallState, ParameterReference, ProjectTab, ScalarType } from './types';
import type { TacticModel } from './models';

interface Context { tab: ProjectTab; models: Map<string, TacticModel> }
const contexts = new WeakMap<Blockly.Workspace, Context>();
export function setBlockContext(workspace: Blockly.Workspace, context: Context) { contexts.set(workspace, context); }
function context(block: Blockly.Block) {
  const c = contexts.get(block.workspace);
  if (!c) throw new Error('Dotfield blocks require a project workspace context.');
  return c;
}
export interface CallBlock extends Blockly.Block {
  tacticId: string;
  argumentShapes: ArgumentShape[];
  getProcedureModel(): TacticModel;
  doProcedureUpdate(): void;
  saveExtraState(): CallState;
  loadExtraState(state: CallState): void;
}
interface DefinitionBlock extends Blockly.Block {
  tacticId: string;
  getProcedureModel(): TacticModel;
  doProcedureUpdate(): void;
}
interface ParameterBlock extends Blockly.Block {
  parameterReference: ParameterReference;
  doProcedureUpdate(): void;
}
let registered = false;
/** Called only by editor/project consumers; importing game code never initializes Blockly. */
export function registerBotBlocks() {
  if (registered) return;
  Blockly.setLocale(Object.fromEntries(Object.entries(En).filter((entry): entry is [string, string] => typeof entry[1] === 'string')));
  for (const [type, spec] of Object.entries(CATALOG)) {
    Blockly.Blocks[type] = { init(this: Blockly.Block) {
      this.setColour(spec.colour); this.setPreviousStatement(true, STEP_CHECK); this.setNextStatement(true, STEP_CHECK);
      const header = this.appendDummyInput('HEADER').appendField(spec.label);
      if (spec.cleanup) header.appendField('cleanup').appendField(new Blockly.FieldDropdown([['none', 'none'], ['release plan on exit', 'release-plan']]), 'CLEANUP');
      for (const [field, kind] of Object.entries(spec.slots ?? {})) {
        header.appendField(field.toLowerCase()).appendField(new Blockly.FieldDropdown(() => {
          const slots = context(this).tab.slots.filter(s => s.kind === kind);
          return slots.length ? slots.map(s => [s.name, s.id] as [string, string]) : [['no slot declared', '']];
        }), field);
      }
      for (const [name, input] of Object.entries(spec.inputs ?? {})) {
        if (input === 'body') this.appendStatementInput(name).setCheck(STEP_CHECK);
        else this.appendValueInput(name).setCheck(scalarCheck(input)).appendField(SCALARS[input].label);
      }
      this.setInputsInline(true);
    } };
  }
  for (const [type, spec] of Object.entries(SCALARS)) {
    Blockly.Blocks[`df_${type}`] = { init(this: Blockly.Block) {
      this.setColour('#8564a3'); this.setOutput(true, scalarCheck(type as ScalarType));
      const field = spec.values ? new Blockly.FieldDropdown(spec.values.map(v => [v, v]))
        : new Blockly.FieldNumber(Number(spec.default), spec.min, spec.max, 1);
      this.appendDummyInput().appendField(field, 'VALUE');
    } };
  }
  Blockly.Blocks.df_main = { init(this: Blockly.Block) {
    this.setColour('#ac7b32'); this.appendDummyInput().appendField('Main');
    this.appendStatementInput('BODY').setCheck(STEP_CHECK);
  } };
  Blockly.Blocks.df_tactic = {
    init(this: DefinitionBlock) {
      this.tacticId = ''; this.setColour('#8564a3');
      this.appendDummyInput().appendField('Define').appendField(new Blockly.FieldLabel('tactic'), 'NAME');
      this.appendStatementInput('BODY').setCheck(STEP_CHECK);
    },
    isProcedureDef() { return true; },
    getProcedureModel(this: DefinitionBlock) { return context(this).models.get(this.tacticId)!; },
    doProcedureUpdate(this: DefinitionBlock) {
      const model = this.getProcedureModel();
      if (model) this.setFieldValue(`${model.getName()}(${model.getParameters().map(p => `${p.getName()}: ${p.getTypes()[0]}`).join(', ')})`, 'NAME');
    },
    saveExtraState(this: DefinitionBlock) { return { tacticId: this.tacticId }; },
    loadExtraState(this: DefinitionBlock, state: { tacticId: string }) { this.tacticId = state.tacticId; this.doProcedureUpdate(); },
  };
  Blockly.Blocks.df_call = {
    init(this: CallBlock) {
      this.tacticId = ''; this.argumentShapes = []; this.setColour('#8564a3');
      this.setPreviousStatement(true, STEP_CHECK); this.setNextStatement(true, STEP_CHECK); this.setInputsInline(true);
      this.appendDummyInput('HEADER').appendField('Call').appendField(new Blockly.FieldLabel('tactic'), 'NAME');
    },
    isProcedureDef() { return false; },
    getProcedureModel(this: CallBlock) { return context(this).models.get(this.tacticId)!; },
    doProcedureUpdate(this: CallBlock) {
      const model = this.getProcedureModel();
      if (!model) { this.setWarningText('Missing tactic definition.'); return; }
      this.setFieldValue(model.getName(), 'NAME');
      const parameters = model.getParameters();
      this.argumentShapes = [
        ...parameters.map(p => this.argumentShapes.find(a => a.parameterId === p.getId()) ?? { parameterId: p.getId(), type: p.getTypes()[0] }),
        ...this.argumentShapes.filter(a => !parameters.some(p => p.getId() === a.parameterId)),
      ];
      let invalid = false;
      for (const arg of this.argumentShapes) {
        const parameter = model.getParameters().find(p => p.getId() === arg.parameterId);
        const name = `ARG_${arg.parameterId}`;
        const input = this.getInput(name) ?? this.appendValueInput(name).setCheck(scalarCheck(arg.type)).appendField('', `LABEL_${arg.parameterId}`);
        this.moveInputBefore(name, null);
        this.setFieldValue(parameter?.getName() ?? '(removed input)', `LABEL_${arg.parameterId}`);
        // Never remove/retype an old input or replace its argument on signature
        // changes: that would silently discard or disconnect the player's source.
        if (!parameter || parameter.getTypes()[0] !== arg.type || !input.connection?.targetBlock()) invalid = true;
      }
      this.setWarningText(invalid ? 'Missing or incompatible arguments. Review this call before compiling.' : null);
    },
    saveExtraState(this: CallBlock): CallState { return { tacticId: this.tacticId, arguments: this.argumentShapes.map(a => ({ ...a })) }; },
    loadExtraState(this: CallBlock, state: CallState) {
      this.tacticId = state.tacticId; this.argumentShapes = state.arguments.map(a => ({ ...a })); this.doProcedureUpdate();
    },
  };
  Blockly.Blocks.df_parameter = {
    init(this: ParameterBlock) {
      this.parameterReference = { parameterId: '', type: 'query' }; this.setColour('#8564a3');
      this.setOutput(true, scalarCheck('query')); this.appendDummyInput().appendField('input').appendField(new Blockly.FieldLabel('?'), 'NAME');
    },
    // Parameter references are refreshed alongside callers by the official helper.
    isProcedureDef() { return false; },
    getProcedureModel(this: ParameterBlock) { return context(this).models.get(context(this).tab.id)!; },
    doProcedureUpdate(this: ParameterBlock) {
      const c = context(this), ref = this.parameterReference;
      const parameter = c.models.get(c.tab.id)?.getParameters().find(p => p.getId() === ref.parameterId);
      this.setFieldValue(parameter?.getName() ?? '(missing input)', 'NAME');
      this.setWarningText(!parameter || parameter.getTypes()[0] !== ref.type ? 'Missing or incompatible parameter reference.' : null);
    },
    saveExtraState(this: ParameterBlock) { return { ...this.parameterReference }; },
    loadExtraState(this: ParameterBlock, state: ParameterReference) {
      this.parameterReference = { ...state }; this.setOutput(true, scalarCheck(state.type)); this.doProcedureUpdate();
    },
  };
  registered = true;
}
