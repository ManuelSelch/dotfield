import { describe, expect, it, vi } from 'vitest';
import { State } from 'mistreevous';
import { createDefaultProject } from '../../../botEditor/defaultProject';
import { directProject } from '../../../botEditor/fixtures/directProject';
import { forwardingProject } from '../../../botEditor/fixtures/forwardingProject';
import { compileProject } from '../../../botEditor/compiler';
import { scopedSlot } from '../../../botEditor/tactics';
import type { BotProject } from '../../../botEditor/types';
import { createSimulation } from '../../state';
import type { Territory } from '../../types';
import { applyAiAction } from '../actions';
import { forecastBattle } from '../forecast';
import { createProgramBot } from './runtime';
import type { MdslEvent } from './agent';

const opening = (owner = 'player', units = 45): Territory[] => [
  {id:'home',owner:'enemy',units:30,x:60,y:80},
  {id:'backup',owner:'enemy',units:30,x:120,y:80},
  {id:'target',owner,units,x:60,y:190},
  {id:'other',owner:'player',units:100,x:300,y:400},
];
function program(p: BotProject) { const r=compileProject(p);if(!r.ok)throw new Error(JSON.stringify(r.diagnostics));return r.program; }
function harness(p = createDefaultProject(), cities = opening()) {
  const compiled=program(p);let state=createSimulation(cities,{unitsPerSecond:0});
  const events: MdslEvent[]=[];const faults=vi.fn();
  const apply=vi.fn((action:Parameters<typeof applyAiAction>[1])=>{state=applyAiAction(state,action,'enemy');return state;});
  const bot=createProgramBot('enemy',()=>state,apply,compiled.definition,{observe:e=>events.push(structuredClone(e)),onFault:faults});
  return {bot,compiled,events,faults,apply,read:()=>state,advance:(ms:number)=>{state=forecastBattle(state,ms);}};
}

describe('parameterized tactics in the real persistent capture runtime',()=>{
  it.each(['neutral','player'])('matches direct-tree game state and status with literal and nested-forwarded %s queries', owner=>{
    const forwarded=forwardingProject();
    forwarded.tabs[0].workspace.blocks.blocks[0].inputs!.BODY.block!.inputs!.BODY.block!.inputs!.ARG_budget.shadow!.fields!.VALUE=1;
    // Compare the same tree topology; the wrapper's separately tested retry
    // decorator intentionally has an extra terminal tick in Mistreevous.
    const wrapper=forwarded.tabs[2].workspace.blocks.blocks[0];wrapper.inputs!.BODY=wrapper.inputs!.BODY.block!.inputs!.BODY;
    const bots=[directProject(),createDefaultProject(),forwarded].map(p=>harness(p,opening(owner)));
    for(const ms of [0,0,1000,12000]) {
      if(ms)bots.forEach(h=>h.advance(ms));
      const status=bots.map(h=>h.bot.step());expect(new Set(status).size).toBe(1);
      bots.slice(1).forEach(h=>expect(h.read(), JSON.stringify(h.events)).toEqual(bots[0].read()));
    }
    for(const h of bots) {
      expect(h.bot.fault).toBeNull();expect(h.apply).toHaveBeenCalledTimes(2);
      expect(h.apply.mock.calls.map(([a])=>a.type==='ground' && a.sourceId)).toEqual(['home','backup']);
      const normalized=(events:MdslEvent[])=>events.map(e=>({...e,...(e.planSlot?{planSlot:'plan'}:{})}));
      expect(normalized(h.events)).toEqual(normalized(bots[0].events));h.bot.dispose();
    }
  });
  it('binds a forwarded numeric retry input across RUNNING ticks rather than fire-and-forget calls',()=>{
    const h=harness(forwardingProject());
    expect(h.bot.step()).toBe(State.RUNNING);expect(h.bot.step()).toBe(State.RUNNING);
    expect(h.events.filter(e=>e.method==='SelectCity').map(e=>e.query)).toEqual(['neutral','neutral']);
    expect(h.apply).not.toHaveBeenCalled();
    expect(h.bot.step()).toBe(State.RUNNING);expect(h.apply).not.toHaveBeenCalled();
    expect(h.bot.step()).toBe(State.RUNNING);expect(h.apply).not.toHaveBeenCalled();
    expect(h.bot.step()).toBe(State.RUNNING);expect(h.apply, JSON.stringify(h.events)).toHaveBeenCalledOnce();
    h.advance(1000);h.bot.step();h.advance(12000);expect(h.bot.step()).toBe(State.SUCCEEDED);
    expect(h.bot.fault).toBeNull();h.bot.dispose();
  });
  it('executes sequential neutral/enemy calls with separate plans and correctly bound cleanup',()=>{
    const p=createDefaultProject();
    const sequence=p.tabs[0].workspace.blocks.blocks[0].inputs!.BODY.block!;
    sequence.type='df_sequence';sequence.fields={CLEANUP:'none',PLAN:'plan'};
    const h=harness(p,[...opening('neutral',5),{id:'victim',owner:'player',units:10,x:70,y:250}]);
    expect(h.bot.step()).toBe(State.RUNNING);h.advance(8000);
    expect(h.bot.step()).toBe(State.RUNNING);h.advance(8000);
    expect(h.bot.step()).toBe(State.SUCCEEDED);
    expect(h.events.filter(e=>e.method==='SelectCity').map(e=>e.query)).toEqual(['neutral','enemy']);
    const planned=h.events.filter(e=>e.method==='PlanCapture' && e.outcome==='planned');
    expect(planned.map(e=>e.planSlot)).toEqual([scopedSlot(['neutral-call'],'plan'),scopedSlot(['enemy-call'],'plan')]);
    expect(h.events.filter(e=>e.method==='ReleasePlan' && e.outcome==='completed').map(e=>e.planSlot)).toEqual(planned.map(e=>e.planSlot));
    expect(h.read().territories.find(c=>c.id==='victim')!.owner).toBe('enemy');
    expect(h.apply).toHaveBeenCalledTimes(2);expect(h.bot.fault).toBeNull();h.bot.dispose();
  });
  it('re-enters a call with fresh attempt memory and stable namespaces, not growing invocation IDs',()=>{
    const h=harness(createDefaultProject(),[...opening('neutral',5),{id:'far',owner:'neutral',units:5,x:60,y:280}]);
    h.bot.step();h.advance(8000);expect(h.bot.step()).toBe(State.SUCCEEDED);
    expect(h.bot.step()).toBe(State.RUNNING);h.advance(8000);expect(h.bot.step()).toBe(State.SUCCEEDED);
    const plans=h.events.filter(e=>e.method==='PlanCapture' && e.outcome==='planned');
    expect(plans).toHaveLength(2);expect(plans[0].planSlot).toBe(plans[1].planSlot);
    expect(plans.map(e=>e.sourceIds)).toEqual([['home'],['target']]);
    expect(h.events.filter(e=>e.method==='ReleasePlan' && e.outcome==='completed')).toHaveLength(2);
    expect(h.apply).toHaveBeenCalledTimes(2);expect(h.bot.fault).toBeNull();h.bot.dispose();
  });
  it('propagates an expected call failure and releases the bound plan without issuing an order',()=>{
    const p=createDefaultProject();
    const firstCall=p.tabs[0].workspace.blocks.blocks[0].inputs!.BODY.block!.inputs!.BODY.block!;delete firstCall.next;
    const capture=p.tabs[1].workspace.blocks.blocks[0].inputs!.BODY.block!;
    const retry=capture.inputs!.BODY.block!.next!.block!.next!.block!.next!.block!;
    retry.next={block:{id:'exhaust-list',type:'df_next_city',fields:{LIST:'sources',OUTPUT:'source'},next:retry.next}};
    const h=harness(p,opening('neutral',5).filter(c=>c.id!=='backup'));
    expect(h.bot.step()).toBe(State.FAILED);expect(h.bot.fault).toBeNull();expect(h.apply).not.toHaveBeenCalled();
    expect(h.events).toContainEqual(expect.objectContaining({method:'ReleasePlan',outcome:'failed',planSlot:scopedSlot(['neutral-call'],'plan')}));
    h.bot.dispose();
  });
  it('abort-cleans a nested invocation without changing already accepted game transfers',()=>{
    const h=harness(forwardingProject(),opening('neutral',5));
    expect(h.bot.step()).toBe(State.RUNNING);expect(h.apply).toHaveBeenCalledOnce();
    const before=h.read();h.bot.dispose();h.bot.step();expect(h.read()).toBe(before);
    expect(h.events).toContainEqual(expect.objectContaining({method:'ReleasePlan',outcome:'aborted',planSlot:scopedSlot(['neutral-call','forwarded-call'],'plan')}));
    expect(h.apply).toHaveBeenCalledOnce();
  });
  it('a shared source-limit edit changes gameplay only on newly compiled programs',()=>{
    const p=createDefaultProject(), original=harness(p);
    const capture=p.tabs[1].workspace.blocks.blocks[0].inputs!.BODY.block!;
    const retry=capture.inputs!.BODY.block!.next!.block!.next!.block!.next!.block!;
    retry.inputs!.ATTEMPTS.shadow!.fields!.VALUE=1;
    const changed=harness(p);
    expect(changed.bot.step()).toBe(State.RUNNING); // one failed attempt, then exhaustion resolves
    const changedState=changed.bot.step();expect(changedState,JSON.stringify(changed.events)).toBe(State.FAILED);expect(changed.apply).not.toHaveBeenCalled();expect(changed.bot.fault).toBeNull();
    expect(original.bot.step()).toBe(State.RUNNING);expect(original.bot.step()).toBe(State.RUNNING);
    original.advance(1000);original.bot.step();original.advance(12000);expect(original.bot.step()).toBe(State.SUCCEEDED);
    expect(original.apply).toHaveBeenCalledTimes(2);original.bot.dispose();changed.bot.dispose();
  });
});
