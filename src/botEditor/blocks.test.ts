import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly/core';
import { CATALOG } from './catalog';
import { createDefaultProject } from './defaultProject';
import { loadProject } from './project';
import { scalarCheck, STEP_CHECK } from './types';

describe('bounded bot block catalog', () => {
  it('seeds every flow/primitive, correctly typed slots and visible cleanup', () => {
    const session = loadProject(createDefaultProject());
    try {
      const all = [...session.workspaces.values()].flatMap(w => w.getAllBlocks(false));
      for (const type of Object.keys(CATALOG)) expect(all.some(b => b.type === type)).toBe(true);
      const capture = session.workspaces.get('capture')!;
      expect(capture.getBlockById('capture-body')!.getFieldValue('CLEANUP')).toBe('release-plan');
      expect(capture.getBlockById('attempt-capture')!.getFieldValue('CLEANUP')).toBe('none');
      expect(capture.getBlockById('select-target')!.getInputTargetBlock('QUERY')!.type).toBe('df_parameter');
      expect(capture.getBlockById('forecast')!.getInputTargetBlock('HORIZON')!.getFieldValue('VALUE')).toBe(15000);
      for (const block of all) {
        const spec = CATALOG[block.type];
        if (!spec) continue;
        expect(block.previousConnection!.getCheck()).toEqual([STEP_CHECK]);
        expect(block.nextConnection!.getCheck()).toEqual([STEP_CHECK]);
        for (const [input, type] of Object.entries(spec.inputs ?? {})) {
          expect(block.getInput(input)!.connection!.getCheck()).toEqual([type === 'body' ? STEP_CHECK : scalarCheck(type)]);
        }
        for (const [field, kind] of Object.entries(spec.slots ?? {})) {
          const options = (block.getField(field) as Blockly.FieldDropdown).getOptions(false);
          const tab = session.save().tabs.find(t => session.workspaces.get(t.id) === block.workspace)!;
          expect(options.map(o => o[1])).toEqual(tab.slots.filter(s => s.kind === kind).map(s => s.id));
        }
      }
    } finally { session.dispose(); }
  });
  it('preserves replacement blocks and their literal shadows, and accepts Blockly-generated IDs', () => {
    const session = loadProject(createDefaultProject());
    try {
      const ws = session.workspaces.get('capture')!;
      const ref = ws.newBlock('df_parameter');
      ref.loadExtraState!({ parameterId: 'kind', type: 'query' });
      const literal = ws.getBlockById('target-ranking')!;
      // Replace a query shadow in Main with another query literal, retaining
      // its fallback shadow as normal Blockly editing does.
      const main = session.workspaces.get('main')!;
      const replacement = main.newBlock('df_query');replacement.setFieldValue('enemy', 'VALUE');
      main.getBlockById('neutral-call')!.getInput('ARG_kind')!.connection!.connect(replacement.outputConnection!);
      expect(literal.outputConnection!.getCheck()).toEqual([scalarCheck('ranking')]);
      const saved = session.save(), restored = loadProject(saved);
      try { expect(restored.save()).toEqual(saved); } finally { restored.dispose(); }
    } finally { session.dispose(); }
  });
});
