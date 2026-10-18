// Read-only imports of the real simulation. No production files/dependencies are changed.
// Run from repository root: node mockups/bot-editor-blockly/measure.mjs
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as Blockly from 'blockly';
import { registerBlocks, wrap, chain, block } from './blocks.js';
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../',import.meta.url));
const server = await createServer({root,configFile:false,server:{middlewareMode:true},
  optimizeDeps:{noDiscovery:true,include:[]},
  // Agent imports only the State enum. Adapt its installed CommonJS export for
  // Vite's SSR evaluator, without copying/changing the real capability code.
  plugins:[{name:'mockup-mistreevous',enforce:'pre',resolveId(id){
    if(id==='mistreevous') return '\0mockup-state';
  },load(id){if(id==='\0mockup-state') return `export const State = ${JSON.stringify(require('mistreevous').State)};`;}}]});
registerBlocks(Blockly);
const stress = process.argv.includes('--stress');
const results = { measuredAt: new Date().toISOString(), stress, node:process.version, platform:process.platform, arch:process.arch, cases:[] };
function sample(name,fn,count=3) {
  console.error(`Measuring: ${name}`);
  fn();const times=[];
  for(let i=0;i<count;i++){const start=performance.now();fn();times.push(performance.now()-start);}
  times.sort((a,b)=>a-b);
  const result={name,samples:count,medianMs:+times[Math.floor(count/2)].toFixed(3),maxMs:+times.at(-1).toFixed(3)};
  results.cases.push(result);console.error(JSON.stringify(result));
}
try {
  const { createSimulation }=await server.ssrLoadModule('/src/game/state.ts');
  const { CaptureAgent }=await server.ssrLoadModule('/src/game/ai/mdsl/agent.ts');
  const { dispatchUnits }=await server.ssrLoadModule('/src/game/dispatch.ts');
  const { forecastBattle }=await server.ssrLoadModule('/src/game/ai/forecast.ts');
  const project=wrap('Stress',chain(...Array.from({length:127},()=>block('sources'))));
  sample('128-block headless load/serialize/dispose',()=>{
    const ws=new Blockly.Workspace();
    try {Blockly.serialization.workspaces.load(project,ws);results.projectBytes=new TextEncoder().encode(JSON.stringify(Blockly.serialization.workspaces.save(ws))).length;}
    finally {ws.dispose();}
  },20);
  // 24 cities, eight eligible donors. Target is intentionally uncapturable, so
  // every requested source prefix must run its complete failed forecast.
  const cities=Array.from({length:24},(_,i)=>({id:`c${i}`,owner:i<8?'enemy':i===8?'neutral':'player',
    units:i<8?30:10000,x:40+(i%6)*60,y:40+Math.floor(i/6)*100}));
  for(const weapon of [false,true]) {
    const opening=cities.map((c,i)=>({...c,...(weapon && i>8?{cityType:i%2?'watchtower':'artillery'}:{})}));
    const state=createSimulation(opening,{unitsPerSecond:0});
    for(const horizon of [15000,60000]) {
      sample(`PlanCapture 24 cities / 8 chosen / ${horizon}ms / ${weapon?'weapons':'production'}`,()=>{
        const agent=new CaptureAgent('enemy',()=>state,()=>state);
        agent.SelectCity('neutral','nearest-reachable','target');agent.SelectSources('target',6,'sources');agent.ClearSet('chosen');
        for(let i=0;i<8;i++){agent.NextCity('sources','source');agent.AddToSet('chosen','source');}
        agent.PlanCapture('target','chosen',horizon,'plan');agent.clear();
      });
      sample(`8 failed authored prefixes / ${horizon}ms / ${weapon?'weapons':'production'}`,()=>{
        const agent=new CaptureAgent('enemy',()=>state,()=>state);
        agent.SelectCity('neutral','nearest-reachable','target');agent.SelectSources('target',6,'sources');agent.ClearSet('chosen');
        for(let i=0;i<8;i++) {agent.NextCity('sources','source');agent.AddToSet('chosen','source');agent.PlanCapture('target','chosen',horizon,'plan');}
        agent.clear();
      },1);
    }
    let busy=stress?state:{...state,territories:state.territories.map((c,i)=>i>=9 && i<17?{...c,units:80}:c)};
    for(let i=0;i<8;i++)busy=dispatchUnits(busy,`c${i}`,'c8','enemy');
    for(let i=9;i<17;i++)busy=dispatchUnits(busy,`c${i}`,'c0','player');
    results[weapon?'weaponTransfers':'productionTransfers']=busy.transfers.length;
    for(const horizon of [15000,60000]) {
      sample(`busy opposing transfers / ${horizon}ms / ${weapon?'weapons':'production'}`,()=>forecastBattle(busy,horizon),1);
    }
  }
  console.log(JSON.stringify(results,null,2));
} finally {await server.close();}
