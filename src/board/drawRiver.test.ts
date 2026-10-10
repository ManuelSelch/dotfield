import { expect, it, vi } from 'vitest';
import { createRiver } from '../game/river';
import { drawRiver } from './drawRiver';

it('draws a warm rounded compact bridge with inset rails without changing its validated footprint',()=>{
  const cities=[{id:'north',owner:'enemy',units:36,x:80,y:190},{id:'south',owner:'player',units:36,x:80,y:290}];
  const river=createRiver({top:225,bottom:255,bridges:[{id:'west',northId:'north',southId:'south',width:64}]},cities);
  const ctx={save:vi.fn(),restore:vi.fn(),fillRect:vi.fn(),strokeRect:vi.fn(),beginPath:vi.fn(),roundRect:vi.fn(),fill:vi.fn(),stroke:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),
    fillStyle:'',strokeStyle:'',lineWidth:0};
  drawRiver(ctx as unknown as CanvasRenderingContext2D,cities,river,360,480);
  expect(ctx.roundRect).toHaveBeenCalledWith(48,221,64,38,3);
  expect(ctx.fillStyle).toBe('#ddd8bf');
  expect(ctx.strokeStyle).toBe('#9aa38d');
  expect(ctx.moveTo).toHaveBeenCalledWith(68,222);
  expect(ctx.lineTo).toHaveBeenCalledWith(68,258);
  expect(ctx.moveTo).toHaveBeenCalledWith(92,222);
  expect(ctx.lineTo).toHaveBeenCalledWith(92,258);
});
