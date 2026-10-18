import { expect, it } from 'vitest';
import { createSimulation } from '../state';
import { chooseOrder } from './decision';
import { resolveAiBehavior } from './behaviors';
import { forecastBattle } from './forecast';
import { applyAiAction, chooseAction } from './actions';
import { dispatchUnits } from '../dispatch';

const opening = (donors = 1) => createSimulation([
  { id: 'rear', owner: 'enemy', units: 50, x: 60, y: 350 },
  ...(donors === 2 ? [{ id: 'rear-right', owner: 'enemy', units: 50, x: 300, y: 350 }] : []),
  { id: 'staging', owner: 'enemy', units: 50, x: 180, y: 330 },
  { id: 'airfield', owner: 'enemy', units: 101, x: 180, y: 300, cityType: 'airfield' as const },
  { id: 'relay', owner: 'player', units: 240, x: 180, y: 40 },
], undefined, undefined, undefined, { cityId: 'relay', activateAtMs: 120000, targetMs: 180000 });

it.each(['balanced', 'aggressive', 'defensive'] as const)(
  '%s uses another staging city when the preferred airfield already has a full load', behavior => {
    expect(chooseOrder(opening(), resolveAiBehavior(behavior)))
      .toMatchObject({ sourceId: 'rear', targetId: 'staging', kind: 'reinforce' });
  });

it('also uses a fallback when the airfield has some room, but not enough for the legal order', () => {
  const state = opening();
  const partlyFull = { ...state, territories: state.territories.map(city =>
    city.id === 'airfield' ? { ...city, units: 70 } : city) };
  expect(chooseOrder(partlyFull, resolveAiBehavior('aggressive')))
    .toMatchObject({ sourceId: 'rear', targetId: 'staging', kind: 'reinforce' });
});

it('still selects the preferred airfield when it can receive the whole supply order', () => {
  const state = opening();
  const empty = { ...state, territories: state.territories.map(city =>
    city.id === 'airfield' ? { ...city, units: 1 } : city) };
  expect(chooseOrder(empty, resolveAiBehavior('aggressive')))
    .toMatchObject({ sourceId: 'rear', targetId: 'airfield', kind: 'reinforce' });
});

it('counts reserved supplies when deciding whether the preferred airfield can take another order', () => {
  const initial = opening(2);
  const empty = { ...initial, territories: initial.territories.map(city =>
    city.id === 'airfield' ? { ...city, units: 30 } : city) };
  const supplied = dispatchUnits(empty, 'rear-right', 'airfield', 'enemy');
  expect(chooseOrder(supplied, resolveAiBehavior('aggressive')))
    .toMatchObject({ sourceId: 'rear', targetId: 'staging', kind: 'reinforce' });
});

it('does not depend on Relay being enabled or the faction being named enemy', () => {
  const initial = opening();
  const state = createSimulation(initial.territories.map(city =>
    city.owner === 'enemy' ? { ...city, owner: 'enemy-2' } : city));
  expect(chooseOrder(state, resolveAiBehavior('aggressive'), 'enemy-2'))
    .toMatchObject({ sourceId: 'rear', targetId: 'staging', kind: 'reinforce' });
});

it('keeps producing and eventually attacks after the airfield supply sink fills up', () => {
  let state = { ...opening(2), elapsedMs: 120000 };
  let maxStaging = 50, attacks = 0, relief = 0;
  const config = resolveAiBehavior('aggressive');
  for (let i = 0; i < 100 && state.roundStatus === 'playing'; i++) {
    const action = chooseAction(state, config);
    if (action) {
      if (action.type === 'ground' && action.kind === 'attack') attacks++;
      if (action.type === 'ground' && action.kind === 'reinforce') relief++;
      state = applyAiAction(state, action, 'enemy');
    }
    state = forecastBattle(state, 1300);
    maxStaging = Math.max(maxStaging, state.territories.find(c => c.id === 'staging')!.units);
  }
  expect(relief).toBeGreaterThan(2);
  expect(maxStaging).toBeGreaterThan(100);
  expect(attacks).toBeGreaterThan(0);
  expect(state.territories.find(c => c.id === 'relay')?.owner).toBe('enemy');
}, 15_000);
