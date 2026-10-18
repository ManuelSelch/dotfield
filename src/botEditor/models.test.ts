import { describe, expect, it } from 'vitest';
import { createDefaultProject } from './defaultProject';
import { loadProject } from './project';
import { TacticParameter } from './models';
import type { CallBlock } from './blocks';

function using(run: (session: ReturnType<typeof loadProject>) => void) {
  const session = loadProject(createDefaultProject());
  try { run(session); } finally { session.dispose(); }
}
describe('typed Blockly procedure backing models', () => {
  it('shares the same model across tabs and preserves calls/parameter references through renaming', () => using(session => {
    const model = session.models.get('capture')!;
    expect(session.workspaces.get('main')!.getProcedureMap().get('capture')).toBe(model);
    expect(session.workspaces.get('capture')!.getProcedureMap().get('capture')).toBe(model);
    model.setName('Take city'); model.getParameter(0).setName('targetKind');
    const main = session.workspaces.get('main')!;
    const call = main.getBlockById('neutral-call')! as CallBlock;
    expect(call.getFieldValue('NAME')).toBe('Take city');
    expect(call.getFieldValue('LABEL_kind')).toBe('targetKind');
    expect(call.getInputTargetBlock('ARG_kind')!.getFieldValue('VALUE')).toBe('neutral');
    expect(session.workspaces.get('capture')!.getBlockById('kind-reference')!.getFieldValue('NAME')).toBe('targetKind');
    const restored = loadProject(session.save());
    try {
      expect(restored.models.get('capture')!.getId()).toBe('capture');
      expect(restored.models.get('capture')!.getParameter(0).getId()).toBe('kind');
      expect(restored.workspaces.get('main')!.getBlockById('neutral-call')!.getInputTargetBlock('ARG_kind')!.getFieldValue('VALUE')).toBe('neutral');
    } finally { restored.dispose(); }
  }));
  it('preserves obsolete arguments on signature changes instead of substituting values', () => using(session => {
    const model = session.models.get('capture')!;
    const call = session.workspaces.get('main')!.getBlockById('neutral-call')! as CallBlock;
    model.getParameter(0).setTypes(['army']);
    expect(call.getInputTargetBlock('ARG_kind')!.type).toBe('df_query');
    expect(call.argumentShapes).toEqual([{ parameterId: 'kind', type: 'query' }]);
    model.deleteParameter(0);
    expect(call.getFieldValue('LABEL_kind')).toBe('(removed input)');
    const saved = session.save(), restored = loadProject(saved);
    try {
      const copy = restored.workspaces.get('main')!.getBlockById('neutral-call')! as CallBlock;
      expect(copy.getInputTargetBlock('ARG_kind')!.getFieldValue('VALUE')).toBe('neutral');
      expect(copy.getFieldValue('LABEL_kind')).toBe('(removed input)');
      expect(restored.save()).toEqual(saved);
    } finally { restored.dispose(); }
  }));
  it('adds a new parameter with an empty visible call input, never a guessed default', () => using(session => {
    const model = session.models.get('capture')!, ws = session.workspaces.get('capture')!;
    model.insertParameter(new TacticParameter(ws, 'limit', 'limit').setTypes(['attempts']), 1);
    const call = session.workspaces.get('main')!.getBlockById('neutral-call')! as CallBlock;
    expect(call.getInput('ARG_limit')).not.toBeNull();
    expect(call.getInputTargetBlock('ARG_limit')).toBeNull();
    const saved = session.save(), restored = loadProject(saved);
    try { expect(restored.save()).toEqual(saved); } finally { restored.dispose(); }
  }));
  it('keeps arguments bound by identity when parameter order changes', () => using(session => {
    const model = session.models.get('capture')!, ws = session.workspaces.get('capture')!;
    const limit = new TacticParameter(ws, 'limit', 'limit').setTypes(['attempts']);
    model.insertParameter(limit, 1);
    const call = session.workspaces.get('main')!.getBlockById('neutral-call')! as CallBlock;
    const literal = call.workspace.newBlock('df_attempts');literal.setFieldValue(3, 'VALUE');
    call.getInput('ARG_limit')!.connection!.connect(literal.outputConnection!);
    model.deleteParameter(1);model.insertParameter(limit, 0);
    expect(call.argumentShapes.map(a => a.parameterId)).toEqual(['limit', 'kind']);
    expect(call.getInputTargetBlock('ARG_kind')!.getFieldValue('VALUE')).toBe('neutral');
    expect(call.getInputTargetBlock('ARG_limit')!.getFieldValue('VALUE')).toBe(3);
  }));
  it('rejects return values, global-variable types, duplicate names and invalid indices', () => using(session => {
    const model = session.models.get('capture')!, ws = session.workspaces.get('capture')!;
    expect(() => model.setReturnTypes(['number'])).toThrow(/return/);
    expect(() => model.getParameter(0).setTypes(['city'])).toThrow(/scalar/);
    expect(() => model.deleteParameter(99)).toThrow(/index/);
    expect(() => model.insertParameter(new TacticParameter(ws, 'kind', 'different'), 1)).toThrow(/Duplicate/);
    expect(ws.getVariableMap().getAllVariables()).toEqual([]);
  }));
});
