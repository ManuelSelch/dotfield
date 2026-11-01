import { expect, it } from 'vitest';

import { projectBoard } from '@/board/layout';

import { BATCH_SIZE, DOT_RADIUS, DOT_SPACING, TERRITORY_RADIUS } from './settings';

it('uses the approved smaller shared geometry without reducing batch size', () => {
  expect(TERRITORY_RADIUS).toBe(14);
  expect(DOT_RADIUS).toBe(3);
  expect(DOT_SPACING).toBe(8);
  expect(BATCH_SIZE).toBe(5);
  const city = { id: 'home', owner: 'player', units: 36, x: 180, y: 240 };
  expect(projectBoard([city], 360, 480)[0]).toMatchObject({ radius: 14, fontSize: 14 });
  expect(projectBoard([city], 720, 960)[0]).toMatchObject({ radius: 28, fontSize: 28 });
  expect(projectBoard([city], 280, 380)[0].fontSize).toBeGreaterThanOrEqual(11);
});
