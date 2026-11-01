import { describe, expect, it } from 'vitest';

import { convertCity } from '@/game/city-conversion';
import { canGroundOrder } from '@/game/ground-access';
import { createSimulation } from '@/game/state';
import type { Territory } from '@/game/types';

import { chooseAction } from './actions';
import { chooseOrder } from './decision';
import { newlyDeniedRoutes, breachValue } from './defender-strategy';
const nodes: Territory[] = [
  { id: 'home', x: 40, y: 60, owner: 'enemy', units: 1 },
  { id: 'front-a', x: 180, y: 120, owner: 'enemy', units: 50, cityType: 'defender' },
  { id: 'front-b', x: 180, y: 360, owner: 'enemy', units: 50 },
  { id: 'rear-a', x: 40, y: 160, owner: 'enemy', units: 1 },
  { id: 'rear-b', x: 40, y: 400, owner: 'enemy', units: 1 },
  { id: 'producer', x: 40, y: 280, owner: 'enemy', units: 1 },
  { id: 'hostile', x: 350, y: 360, owner: 'player', units: 150 },
];
describe('Defender AI border tradeoffs', () => {
  it('finds marginal protection from a second Defender while ignoring already blocked routes', () => {
    const state = createSimulation(nodes, { unitsPerSecond: 0 });
    const converted = convertCity(state, 'front-b', 'defender', 'enemy');
    expect(newlyDeniedRoutes(state, converted, 'enemy')).toBeGreaterThan(0);
    expect(newlyDeniedRoutes(converted, converted, 'enemy')).toBe(0);
    expect(chooseAction(state)).toMatchObject({
      type: 'convert',
      cityId: 'front-b',
      cityType: 'defender',
    });
  });
  it('still preserves a two-thirds producer base', () => {
    const state = createSimulation(
      nodes.filter((c) => !['rear-a', 'rear-b', 'producer'].includes(c.id)),
      { unitsPerSecond: 0 },
    );
    expect(chooseAction(state)).not.toMatchObject({ type: 'convert' });
  });
  it('attacks a feasible blocker, not a city behind it; values a breach only when it opens routes', () => {
    const state = createSimulation(
      [
        { id: 'army', x: 40, y: 240, owner: 'enemy', units: 50 },
        { id: 'wall', x: 180, y: 240, owner: 'player', units: 2, cityType: 'defender' },
        { id: 'rear', x: 320, y: 240, owner: 'player', units: 1 },
      ],
      { unitsPerSecond: 0 },
    );
    expect(breachValue(state, 'wall', 'enemy')).toBeGreaterThan(0);
    const order = chooseOrder(state)!;
    expect(order).toMatchObject({ targetId: 'wall' });
    expect(
      canGroundOrder(
        state,
        state.territories[0],
        state.territories.find((c) => c.id === order.targetId)!,
      ),
    ).toBe(true);
  });
});
