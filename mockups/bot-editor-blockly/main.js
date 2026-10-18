import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en';
Blockly.setLocale(En);

const $ = id => document.getElementById(id);
import { colours, registerBlocks, block, chain, wrap, defaults, previousSibling, moveStep } from './blocks.js';
registerBlocks(Blockly);
const theme = Blockly.Theme.defineTheme('dotfield', { base: Blockly.Themes.Classic,
  fontStyle: {family:'system-ui, sans-serif',weight:'500',size:11},
  componentStyles:{workspaceBackgroundColour:'#fcfdf8',insertionMarkerColour:'#315c42',insertionMarkerOpacity:0.4} });
const workspace = Blockly.inject('workspace', {renderer:'zelos',theme,trashcan:true,
  scrollbars:true,move:{scrollbars:true,drag:true,wheel:true},zoom:{controls:true,wheel:false,startScale:0.85,minScale:0.35,maxScale:1.3},
  grid:{spacing:22,length:1,colour:'#dce4d7',snap:false},sounds:false});
const resize = new ResizeObserver(() => Blockly.svgResize(workspace));
resize.observe($('workspace'));
let projects = defaults(), active = 'main', selectedId, loading = false;
// Disposable histories are per tab; production undo/model ownership is intentionally not defined here.
const histories = { main:{undo:[],redo:[]}, capture:{undo:[],redo:[]} };
let lastSnapshot;
const serialize = () => Blockly.serialization.workspaces.save(workspace);
function select(id) {
  selectedId = id;
  const b = workspace.getBlockById(id);
  if (b) { b.select(); $('steps').value = id; }
  renderFields();
}
function allSteps() {
  const result = [];
  function visit(b, depth) {
    if (!b) return;
    result.push({block:b,depth});
    visit(b.getInputTargetBlock('BODY'), depth + 1);
    visit(b.getNextBlock(), depth);
  }
  workspace.getTopBlocks(true).forEach(b => visit(b,0));
  return result;
}
function refresh() {
  const steps = allSteps();
  $('steps').replaceChildren(...steps.map(({block:b,depth}) => new Option(`${'· '.repeat(depth)}${b.toString(80)}`,b.id)));
  if (!workspace.getBlockById(selectedId)) selectedId = steps[0]?.block.id;
  $('steps').value = selectedId || '';
  renderFields();
  const capture = active === 'capture' ? serialize() : projects.capture;
  const min = findField(capture,'sources','MIN',6), attempts = findField(capture,'retry','TIMES',4);
  $('summary').textContent = `Both Main calls share Capture(kind): minimum army ${min}, retry budget ${attempts}. Slots are illustrative; runtime compilation comes later.`;
  $('undo').disabled = !histories[active].undo.length;
  $('redo').disabled = !histories[active].redo.length;
}
function findField(data,type,field,fallback) {
  let found = fallback;
  function walk(b) { if (!b) return; if(b.type===type) found=b.fields?.[field] ?? fallback;
    Object.values(b.inputs || {}).forEach(i => walk(i.block)); walk(b.next?.block); }
  data.blocks?.blocks.forEach(walk); return found;
}
function renderFields() {
  const b = workspace.getBlockById(selectedId);
  $('fields').replaceChildren();
  if (!b) return;
  b.inputList.flatMap(i=>i.fieldRow).filter(f=>f.name && f.EDITABLE).forEach(field => {
    const label=document.createElement('label'); label.textContent = {KIND:'Target class',MIN:'Minimum army',TIMES:'Retry attempts',MS:'Forecast ms'}[field.name] || field.name;
    let control;
    if (field instanceof Blockly.FieldDropdown) {
      control=document.createElement('select');
      field.getOptions(false).forEach(([text,value]) => control.add(new Option(text,value)));
    } else { control=document.createElement('input');control.type='number';
      const limits={MIN:[1,999],TIMES:[1,8],MS:[1,60000]}[field.name];
      if(limits) { control.min=limits[0];control.max=limits[1];control.step=1; }
    }
    control.value=field.getValue();
    control.addEventListener('change',()=>{ if(!control.checkValidity()) {control.reportValidity();return;} b.setFieldValue(control.value,field.name); });
    label.append(control);$('fields').append(label);
  });
  $('delete').disabled = b.type==='entry';
  $('up').disabled = !previousSibling(b);
  $('down').disabled = !b.getNextBlock();
}
function load(data) {
  loading=true;Blockly.Events.disable();
  try { Blockly.serialization.workspaces.load(data,workspace); workspace.getTopBlocks()[0]?.setFieldValue(active==='main'?'Main':'Capture(kind)','TITLE'); }
  finally { Blockly.Events.enable();loading=false; }
  selectedId=workspace.getTopBlocks()[0]?.id;lastSnapshot=serialize();refresh();
}
function switchTab(tab) {
  projects[active]=serialize();active=tab;
  $('main-tab').setAttribute('aria-pressed',String(tab==='main'));
  $('capture-tab').setAttribute('aria-pressed',String(tab==='capture'));
  $('signature').hidden=tab!=='capture';load(projects[active]);
  $('status').textContent=tab==='capture'?'Editing shared Capture(kind) — changes apply to both calls.':'Main · neutral and enemy calls use distinct arguments.';
}
workspace.addChangeListener(event => {
  if(loading) return;
  if(event.type===Blockly.Events.SELECTED && event.newElementId) { selectedId=event.newElementId;refresh();return; }
  if(event.isUiEvent) return;
  const next=serialize();
  if(JSON.stringify(next)!==JSON.stringify(lastSnapshot)) {
    histories[active].undo.push(lastSnapshot);histories[active].redo=[];lastSnapshot=next;
    $('status').textContent='Draft changed · not saved or connected to the game.';
    refresh();
  }
});
const library=[['selector','Try in order','flow'],['sequence','Sequence + cleanup','flow'],['retry','Bounded retry','flow'],['call','Call Capture','call'],['select_city','Select city','city'],['sources','Select sources','city'],['clear','Clear chosen set','city'],['next','Next city','city'],['add','Add to chosen','city'],['plan','Plan capture','plan'],['execute','Execute plan','plan']];
library.forEach(([type,label,colour])=>{
  const button=document.createElement('button');button.textContent=`+ ${label}`;button.style.setProperty('--color',colours[colour]);
  button.onclick=()=>{
    const parent=workspace.getBlockById(selectedId);
    const connection=parent?.getInput('BODY')?.connection || parent?.nextConnection;
    if(!connection) { $('status').textContent='Choose a step or group first.';return; }
    Blockly.Events.setGroup(true);
    const next=connection.targetBlock();connection.disconnect();
    const b=workspace.newBlock(type);b.initSvg();b.render();connection.connect(b.previousConnection);
    if(next)b.nextConnection.connect(next.previousConnection);
    Blockly.Events.setGroup(false);select(b.id);
  };
  $('library').append(button);
});
$('steps').onchange=()=>select($('steps').value);
$('main-tab').onclick=()=>switchTab('main');$('capture-tab').onclick=()=>switchTab('capture');
function move(down) {
  moveStep(workspace,selectedId,down,Blockly);refresh();
}
$('up').onclick=()=>move(false);$('down').onclick=()=>move(true);
$('delete').onclick=()=>{const b=workspace.getBlockById(selectedId);if(b && b.type!=='entry')b.dispose(true);};
function history(from,to) {
  const h=histories[active];if(!h[from].length)return;h[to].push(serialize());load(h[from].pop());
}
$('undo').onclick=()=>history('undo','redo');$('redo').onclick=()=>history('redo','undo');
$('reset').onclick=()=>{projects=defaults();for(const h of Object.values(histories)){h.undo=[];h.redo=[];}load(projects[active]);$('status').textContent='Example restored in page memory only.';};
$('save').onclick=()=>{
  projects[active]=serialize();
  const errors=[];
  for(const [name,data] of Object.entries(projects)) {
    const ws=new Blockly.Workspace();Blockly.serialization.workspaces.load(data,ws);
    if(ws.getTopBlocks().length!==1 || ws.getTopBlocks()[0]?.type!=='entry')errors.push(`${name}: detached steps or missing entry`);
    for(const b of ws.getAllBlocks()) {
      if(b.getInput('BODY') && !b.getInputTargetBlock('BODY'))errors.push(`${name}: empty ${b.type}`);
      if(name==='capture' && b.type==='call')errors.push('Capture cannot call itself (recursion)');
    }
    ws.dispose();
  }
  $('status').textContent=errors.length?`Draft check: ${errors.join('; ')}`:'Basic structure OK. Not saved: project validation, compilation and game activation are later slices.';
};
$('inspect').onclick=()=>{projects[active]=serialize();$('json').textContent=JSON.stringify({prototypeVersion:1,parameters:[{id:'kind',type:'target-class'}],workspaces:projects},null,2);};
$('measure').onclick=()=>{
  const samples=[];const data=wrap('Stress',chain(...Array.from({length:127},()=>block('sources'))));
  for(let i=0;i<21;i++) {
    const start=performance.now();const ws=new Blockly.Workspace();Blockly.serialization.workspaces.load(data,ws);
    const json=JSON.stringify(Blockly.serialization.workspaces.save(ws));ws.dispose();
    if(i)samples.push(performance.now()-start);
    if(i===20)$('measurement').textContent=`128 blocks · ${new TextEncoder().encode(json).length} bytes\n`;
  }
  samples.sort((a,b)=>a-b);$('measurement').textContent+=`Headless load + serialize + dispose, 20 warm samples\nmedian ${samples[10].toFixed(2)} ms · max ${samples.at(-1).toFixed(2)} ms\nNot rendered/touch/gameplay performance; run on target phone too.`;
};
window.addEventListener('pagehide',()=>{resize.disconnect();workspace.dispose();},{once:true});
load(projects.main);
if(new URLSearchParams(location.search).get('script')==='capture')switchTab('capture');
$('status').textContent='Real Blockly / Zelos · select a block or use the step picker below.';
