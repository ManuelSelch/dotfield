import { expect, it, vi } from 'vitest';
import { createSimulation } from '../game/state';
import { drawDrag } from './drawDrag';
import { drawDefenderBorders } from './drawDefenderBorders';
import { groundOrderFeedback } from './groundOrderFeedback';
import { featureLabels } from './featureLabels';
const cities = [
  { id: 'source', x: 40, y: 240, owner: 'player', units: 40 },
  { id: 'wall', x: 180, y: 240, owner: 'enemy', units: 0, cityType: 'defender' as const },
  { id: 'rear', x: 320, y: 240, owner: 'enemy', units: 10 },
];
function context() { return { save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(), beginPath: vi.fn(),
  moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn(), arc: vi.fn(), strokeStyle: '' }; }
it('names the first blocker and offers manual counterplay for all input modes', () => {
  const state = createSimulation(cities);
  expect(groundOrderFeedback(state, cities[0], cities[2])).toBe('Defender wall blocks enemy ground transit. Attack it or stage around it.');
  expect(groundOrderFeedback(state, cities[0], cities[1])).toBeNull();
  expect(featureLabels(cities[1])).toContain('blocks hostile ground transit through its region');
  expect(featureLabels({ ...cities[1], owner: 'neutral' })).toContain('Transit blocking inactive while neutral');
});
it('draws owner-coloured fortified edges for active Defenders only', () => {
  const ctx=context();
  drawDefenderBorders(ctx as never, cities, 360,480);
  expect(ctx.stroke).toHaveBeenCalledTimes(2);
  expect(ctx.setLineDash).toHaveBeenCalledWith([2,7]);
  expect(ctx.lineTo).toHaveBeenCalled();
  const neutral=context();
  drawDefenderBorders(neutral as never, cities.map(c=>({...c,owner:'neutral'})),360,480);
  expect(neutral.stroke).not.toHaveBeenCalled();
});
it('marks a blocked ground route red but a direct attack and aircraft bypass green', () => {
  const selection={sourceId:'source',targetId:'rear',point:cities[2]};
  const ctx=context();
  drawDrag(ctx as never,cities,selection,360,480);
  expect(ctx.strokeStyle).toBe('#bd655f');
  drawDrag(ctx as never,cities,{...selection,targetId:'wall'},360,480);
  expect(ctx.strokeStyle).toBe('#267c72');
  drawDrag(ctx as never,cities,selection,360,480,undefined,undefined,true);
  expect(ctx.strokeStyle).toBe('#267c72');
});
