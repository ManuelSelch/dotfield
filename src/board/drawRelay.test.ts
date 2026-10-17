import { expect, it, vi } from 'vitest';
import { drawRelay } from './drawRelay';
import { createSimulation } from '../game/state';
const cities=[{id:'relay',owner:'player',units:20,x:180,y:240},{id:'enemy',owner:'enemy',units:20,x:300,y:420}];
it('draws an independent gold marker without changing city geometry and omits it for legacy rounds',()=>{
  const ctx={save:vi.fn(),restore:vi.fn(),beginPath:vi.fn(),arc:vi.fn(),stroke:vi.fn(),setLineDash:vi.fn(),fillText:vi.fn()} as unknown as CanvasRenderingContext2D;
  drawRelay(ctx,createSimulation(cities),360,480);expect(ctx.arc).not.toHaveBeenCalled();
  drawRelay(ctx,createSimulation(cities,undefined,undefined,undefined,{cityId:'relay',activateAtMs:120000,targetMs:180000}),360,480);
  expect(ctx.arc).toHaveBeenCalledWith(180,240,22,0,Math.PI*2);
  expect(ctx.fillText).toHaveBeenCalledWith('RELAY',180,211);
});
