import { expect, it } from 'vitest';
import { MAPS } from './maps';
import { compileRoundSetup } from '../game/upgrades/compile';
import { createSession } from '../game/session';

it('offers the approved bridge field and preserves its authored river through upgrades and replay', () => {
  const map = MAPS.find(m => m.id === 'bridges')!;
  expect(map).toBeDefined();
  expect(map.territories).toHaveLength(10);
  expect(map.river?.bridges).toHaveLength(2);
  const setup = compileRoundSetup(map.territories, { player: ['industry'] }, undefined, {}, map.river);
  expect(setup.river).toEqual(map.river);
  const session = createSession(setup.territories, null, setup.rules, { river: setup.river });
  session.start();
  expect(session.dispatch('south', 'north').transfers).toHaveLength(0);
  expect(session.dispatch('west-south', 'west-north').transfers.length).toBeGreaterThan(0);
  session.restart();
  expect(session.state.river).toEqual(map.river);
  expect(session.state.transfers).toHaveLength(0);
});
