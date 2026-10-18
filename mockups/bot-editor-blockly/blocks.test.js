import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import { registerBlocks, defaults, previousSibling, moveStep } from './blocks.js';
registerBlocks(Blockly);
function workspace(tab, run) {
  const ws = new Blockly.Workspace();
  try { Blockly.serialization.workspaces.load(defaults()[tab],ws); run(ws); }
  finally { ws.dispose(); }
}
test('Main keeps distinct neutral/enemy calls; Capture forwards kind and exposes cleanup',()=>{
  workspace('main', ws=>assert.deepEqual(ws.getBlocksByType('call').map(b=>b.getFieldValue('KIND')),['neutral','enemy']));
  workspace('capture', ws=>{
    assert.equal(ws.getBlocksByType('select_city')[0].getFieldValue('KIND'),'$kind');
    assert.deepEqual(ws.getBlocksByType('sequence').map(b=>b.getFieldValue('CLEANUP')).sort(),['none','release plan']);
    assert.equal(ws.getAllBlocks().length,11);
  });
});
test('workspace round trip preserves stable IDs, ordering and shared-definition edits',()=>{
  workspace('capture', ws=>{
    ws.getBlocksByType('sources')[0].setFieldValue(12,'MIN');
    const before=Blockly.serialization.workspaces.save(ws);
    const copy=new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(before,copy);
      assert.deepEqual(Blockly.serialization.workspaces.save(copy),before);
      assert.equal(copy.getBlocksByType('sources')[0].getFieldValue('MIN'),12);
    } finally {copy.dispose();}
  });
});
test('numeric fields clamp finite retry and horizon bounds',()=>{
  workspace('capture',ws=>{
    const retry=ws.getBlocksByType('retry')[0],plan=ws.getBlocksByType('plan')[0];
    retry.setFieldValue(999,'TIMES');plan.setFieldValue(90000,'MS');
    assert.equal(retry.getFieldValue('TIMES'),8);assert.equal(plan.getFieldValue('MS'),60000);
  });
});
test('first child cannot move above its containing group',()=>{
  workspace('capture',ws=>{
    const first=ws.getBlocksByType('select_city')[0],before=Blockly.serialization.workspaces.save(ws);
    assert.equal(previousSibling(first),null);
    assert.equal(moveStep(ws,first.id,false,Blockly),false);
    assert.deepEqual(Blockly.serialization.workspaces.save(ws),before);
  });
});
test('keyboard reorder swaps only siblings and preserves the tail',()=>{
  workspace('capture',ws=>{
    const first=ws.getBlocksByType('select_city')[0],second=first.getNextBlock(),third=second.getNextBlock();
    assert.equal(moveStep(ws,first.id,true,Blockly),true);
    assert.equal(second.getNextBlock(),first);assert.equal(first.getNextBlock(),third);
    assert.equal(moveStep(ws,first.id,false,Blockly),true);
    assert.equal(first.getNextBlock(),second);assert.equal(second.getNextBlock(),third);
  });
});
