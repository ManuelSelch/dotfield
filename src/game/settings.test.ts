import { expect, it } from 'vitest';
import { BATCH_SIZE, DOT_RADIUS, DOT_SPACING, TERRITORY_RADIUS } from './settings';
import { projectBoard } from '../board/layout';

it('uses the approved smaller shared geometry without reducing batch size', () => {
  expect(TERRITORY_RADIUS).toBe(17);
  expect(DOT_RADIUS).toBe(3.8);
  expect(DOT_SPACING).toBe(10);
  expect(BATCH_SIZE).toBe(5);
  const city = { id: 'home', owner: 'player', units: 36, x: 180, y: 240 };
  expect(projectBoard([city], 360, 480)[0].radius).toBe(17);
  expect(projectBoard([city], 720, 960)[0].radius).toBe(34);
});
