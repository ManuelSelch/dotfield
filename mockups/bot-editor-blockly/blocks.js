// Deliberately local to the disposable feasibility study, not a production project format.
export const colours = { flow: '#ac7b32', city: '#4c8260', plan: '#4c7f9c', call: '#8564a3' };
export function registerBlocks(Blockly) {
  const statement = (type, message0, args0, style) => ({ type, message0, args0,
    previousStatement: 'Step', nextStatement: 'Step', colour: colours[style] });
  const dropdown = (name, options) => ({ type: 'field_dropdown', name, options: options.map(v => [v, v]) });
  const number = (name, value, min, max) => ({ type: 'field_number', name, value, min, max, precision: 1 });
  Blockly.defineBlocksWithJsonArray([
    { type: 'entry', message0: '%1 %2', args0: [{type:'field_label', name:'TITLE', text:'Main'}, {type:'input_statement',name:'BODY',check:'Step'}], colour: colours.flow },
    statement('selector', 'Try in order %1', [{type:'input_statement',name:'BODY',check:'Step'}], 'flow'),
    statement('sequence', 'Sequence · cleanup %1 %2', [dropdown('CLEANUP',['release plan','none']),{type:'input_statement',name:'BODY',check:'Step'}], 'flow'),
    statement('retry', 'Retry up to %1 times %2', [number('TIMES',4,1,8),{type:'input_statement',name:'BODY',check:'Step'}], 'flow'),
    statement('call', 'Capture %1', [dropdown('KIND',['neutral','enemy'])], 'call'),
    statement('select_city', 'Select %1 city · nearest reachable → target', [dropdown('KIND',['$kind','neutral','enemy'])], 'city'),
    statement('sources', 'Sources for target · minimum army %1 → sources', [number('MIN',6,1,999)], 'city'),
    statement('clear', 'Clear chosen set', [], 'city'),
    statement('next', 'Next city from sources → source', [], 'city'),
    statement('add', 'Add source to chosen set', [], 'city'),
    statement('plan', 'Plan capture · target + chosen · %1 ms → plan', [number('MS',15000,1,60000)], 'plan'),
    statement('execute', 'Execute plan · stays RUNNING until finished', [], 'plan'),
  ]);
}
export const block = (type, fields = {}, body, next) => ({type,fields,...(body ? {inputs:{BODY:{block:body}}} : {}),...(next ? {next:{block:next}} : {})});
export const chain = (...items) => items.reduceRight((next,item) => ({...item,...(next ? {next:{block:next}} : {})}), null);
export const wrap = (title, body) => ({blocks:{languageVersion:0,blocks:[{type:'entry',fields:{TITLE:title},x:24,y:24,inputs:{BODY:{block:body}}}]}});
export function defaults() {
  return {
    main: wrap('Main', block('selector',{},chain(block('call',{KIND:'neutral'}),block('call',{KIND:'enemy'})))),
    capture: wrap('Capture(kind)', block('sequence',{},chain(block('select_city',{KIND:'$kind'}),block('sources'),block('clear'),
      block('retry',{},block('sequence',{CLEANUP:'none'},chain(block('next'),block('add'),block('plan')))),block('execute')))),
  };
}
export function previousSibling(b) {
  const previous = b?.getPreviousBlock();
  return previous?.getNextBlock() === b ? previous : null;
}
export function moveStep(workspace, id, down, Blockly) {
  let a=workspace.getBlockById(id), b=down?a?.getNextBlock():previousSibling(a);
  if(!a || !b) return false;
  if(!down)[a,b]=[b,a];
  const before=a.previousConnection.targetConnection,after=b.getNextBlock();
  if(!before) return false;
  Blockly.Events.setGroup(true);
  try {
    a.previousConnection.disconnect();a.nextConnection.disconnect();b.nextConnection.disconnect();
    before.connect(b.previousConnection);b.nextConnection.connect(a.previousConnection);
    if(after)a.nextConnection.connect(after.previousConnection);
  } finally { Blockly.Events.setGroup(false); }
  return true;
}
