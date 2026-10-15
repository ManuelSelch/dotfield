import { expect, it, vi } from 'vitest';
import { drawArtilleryCoverage, drawArtilleryShots } from './drawArtillery';
import { createSimulation } from '../game/state';
import { advanceWorldStep } from '../game/worldStep';

const context=()=>({save:vi.fn(),restore:vi.fn(),beginPath:vi.fn(),arc:vi.fn(),fill:vi.fn(),stroke:vi.fn(),setLineDash:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),fillText:vi.fn()});
const state=()=>createSimulation([
  {id:'gun',owner:'player',cityType:'artillery',x:180,y:240,units:20,features:[{id:'cannon',kind:'artillery',range:90,fireIntervalMs:2000}]},
  {id:'enemy',owner:'enemy',x:180,y:170,units:100},
],{unitsPerSecond:0});
it('scales the range and marks only the current eligible target',()=>{
  const ctx=context();drawArtilleryCoverage(ctx as unknown as CanvasRenderingContext2D,state(),720,960);
  expect(ctx.arc.mock.calls.map(call=>call.slice(0,3))).toEqual([[360,480,300],[360,340,38]]);
});
it('draws border-clipped beam and static −1 feedback, respecting reduced motion and expiry',()=>{
  const next=advanceWorldStep(state(),2000),ctx=context();
  drawArtilleryShots(ctx as unknown as CanvasRenderingContext2D,next,360,480);
  expect(ctx.moveTo).toHaveBeenCalledWith(180,226);
  expect(ctx.lineTo).toHaveBeenCalledWith(180,184);
  expect(ctx.fillText).toHaveBeenCalledWith('−1',180,145);
  const reduced=context();drawArtilleryShots(reduced as unknown as CanvasRenderingContext2D,next,360,480,true);
  expect(reduced.lineTo).not.toHaveBeenCalled();expect(reduced.fillText).toHaveBeenCalledOnce();
  const expired=context();drawArtilleryShots(expired as unknown as CanvasRenderingContext2D,{...next,elapsedMs:2300},360,480);
  expect(expired.arc).not.toHaveBeenCalled();
});
