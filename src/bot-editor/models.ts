import { triggerProceduresUpdate } from '@blockly/block-shareable-procedures';
import * as Blockly from 'blockly/core';

import { SCALAR_TYPES, SOURCE_LIMITS } from './types';
import type { ParameterState, ScalarType, TacticState } from './types';

const nameOf = (name: string) => {
  if (!name.trim() || name.length > 80) throw new Error('A name must contain 1–80 characters.');
  return name;
};
const typeOf = (types: string[]): ScalarType => {
  if (types.length !== 1 || !SCALAR_TYPES.includes(types[0] as ScalarType))
    throw new Error('Unsupported scalar parameter type.');
  return types[0] as ScalarType;
};
/** Blockly backing model, deliberately without the plugin's global-variable parameters. */
export class TacticParameter implements Blockly.procedures.IParameterModel {
  private model?: TacticModel;
  private type: ScalarType = 'query';
  constructor(
    _workspace: Blockly.Workspace,
    private name: string,
    private readonly id: string,
  ) {
    nameOf(name);
  }
  setProcedureModel(model: Blockly.procedures.IProcedureModel): this {
    if (!(model instanceof TacticModel)) throw new Error('Expected a Dotfield tactic model.');
    this.model = model;
    return this;
  }
  setName(name: string): this {
    nameOf(name);
    if (this.model?.getParameters().some((p) => p !== this && p.getName() === name))
      throw new Error('Duplicate parameter name.');
    this.name = name;
    this.model?.notify();
    return this;
  }
  setTypes(types: string[]): this {
    this.type = typeOf(types);
    this.model?.notify();
    return this;
  }
  getName() {
    return this.name;
  }
  getId() {
    return this.id;
  }
  getTypes(): ScalarType[] {
    return [this.type];
  }
  saveState(): ParameterState {
    return { id: this.id, name: this.name, types: [this.type] };
  }
  static loadState(state: object, workspace: Blockly.Workspace) {
    const s = state as ParameterState;
    return new TacticParameter(workspace, s.name, s.id).setTypes(s.types);
  }
}

export class TacticModel implements Blockly.procedures.IProcedureModel {
  private parameters: TacticParameter[] = [];
  private readonly workspaces = new Set<Blockly.Workspace>();
  constructor(
    workspace: Blockly.Workspace,
    private name: string,
    private readonly id: string,
  ) {
    nameOf(name);
    this.attach(workspace);
  }
  attach(workspace: Blockly.Workspace) {
    this.workspaces.add(workspace);
  }
  detach(workspace: Blockly.Workspace) {
    this.workspaces.delete(workspace);
  }
  notify() {
    for (const workspace of this.workspaces) triggerProceduresUpdate(workspace);
  }
  setName(name: string): this {
    nameOf(name);
    for (const ws of this.workspaces)
      if (
        ws
          .getProcedureMap()
          .getProcedures()
          .some((m) => m !== this && m.getName() === name)
      )
        throw new Error('Duplicate tactic name.');

    this.name = name;
    this.notify();
    return this;
  }
  insertParameter(parameter: Blockly.procedures.IParameterModel, index: number): this {
    if (!(parameter instanceof TacticParameter))
      throw new Error('Expected a scalar tactic parameter.');
    if (!Number.isInteger(index) || index < 0 || index > this.parameters.length)
      throw new Error('Invalid parameter index.');
    if (this.parameters.length >= SOURCE_LIMITS.parameters)
      throw new Error('Too many tactic parameters.');
    if (
      this.parameters.some(
        (p) => p.getId() === parameter.getId() || p.getName() === parameter.getName(),
      )
    )
      throw new Error('Duplicate parameter identity or name.');
    parameter.setProcedureModel(this);
    this.parameters.splice(index, 0, parameter);
    this.notify();
    return this;
  }
  deleteParameter(index: number): this {
    if (!Number.isInteger(index) || index < 0 || index >= this.parameters.length)
      throw new Error('Invalid parameter index.');
    this.parameters.splice(index, 1);
    this.notify();
    return this;
  }
  setReturnTypes(types: string[] | null): this {
    if (types !== null) throw new Error('Tactics do not return values.');
    return this;
  }
  setEnabled(enabled: boolean): this {
    if (!enabled) throw new Error('Disabled tactic definitions are not supported.');
    return this;
  }
  getId() {
    return this.id;
  }
  getName() {
    return this.name;
  }
  getParameters() {
    return [...this.parameters];
  }
  getParameter(index: number) {
    return this.parameters[index];
  }
  getReturnTypes(): null {
    return null;
  }
  getEnabled() {
    return true;
  }
  saveState(): TacticState {
    return {
      id: this.id,
      name: this.name,
      returnTypes: null,
      parameters: this.parameters.map((p) => p.saveState()),
    };
  }
  static loadState(state: object, workspace: Blockly.Workspace) {
    const s = state as TacticState;
    // Blockly's loadProcedure attaches parameters after creating this model.
    return new TacticModel(workspace, s.name, s.id);
  }
}
