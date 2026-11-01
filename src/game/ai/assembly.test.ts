import { expect, it } from 'vitest';

import { createSimulation } from '@/game/state';
import type { SimulationState, Territory } from '@/game/types';

import { chooseAction, applyAiAction } from './actions';
import { chooseAssembly } from './assembly';
import { resolveAiBehavior } from './behaviors';
import { forecastBattle } from './forecast';

const city = (id: string, owner: string, units: number, x: number, y: number): Territory => ({
  id,
  owner,
  units,
  x,
  y,
});

function ownedFaction(): Territory[] {
  return [
    city('staging', 'enemy', 50, 180, 300),
    city('base', 'enemy', 50, 60, 420),
    city('east', 'enemy', 50, 300, 420),
    city('rear', 'enemy', 50, 180, 460),
    city('west', 'enemy', 50, 40, 300),
  ];
}

/** A strong neutral objective no single city can take, with four rear donors
 * able to reach a staging city that borders it. */
function strongNeutral(units = 240): SimulationState {
  return createSimulation(
    [...ownedFaction(), city('objective', 'neutral', units, 180, 160)],
    undefined,
    undefined,
    undefined,
  );
}

function relayBoard(relayUnits: number): SimulationState {
  const initial = createSimulation(
    [
      ...ownedFaction(),
      city('relay', 'player', relayUnits, 180, 160),
      city('player-home', 'player', 200, 180, 40),
    ],
    undefined,
    undefined,
    undefined,
    { cityId: 'relay', activateAtMs: 0, targetMs: 600_000 },
  );
  return {
    ...initial,
    elapsedMs: 120_000,
    relay: { ...initial.relay!, scoresMs: { player: 60_000, enemy: 0 } },
  };
}

it('assembles at a staging city for an objective no single city can capture', () => {
  const state = strongNeutral();
  const config = resolveAiBehavior('aggressive');
  expect(chooseAssembly(state, config, 'enemy')).toMatchObject({
    kind: 'reinforce',
    targetId: 'staging',
  });
  // The action is preparation, never an optional role build.
  expect(chooseAction(state, config)).toMatchObject({
    type: 'ground',
    kind: 'reinforce',
    targetId: 'staging',
  });
});

it('assembles over several decisions and then captures the objective', () => {
  let state = strongNeutral();
  const config = resolveAiBehavior('aggressive');
  let reinforced = false;
  for (let i = 0; i < 60 && state.roundStatus === 'playing'; i++) {
    const action = chooseAction(state, config);
    if (action) {
      if (action.type === 'ground' && action.kind === 'reinforce' && action.targetId === 'staging')
        reinforced = true;
      state = applyAiAction(state, action, 'enemy');
    }
    state = forecastBattle(state, config.decisionIntervalMs);
    if (state.territories.find((c) => c.id === 'objective')?.owner === 'enemy') break;
  }
  expect(reinforced).toBe(true);
  expect(state.territories.find((c) => c.id === 'objective')?.owner).toBe('enemy');
});

it('still attacks a relay directly when one source can already capture it', () => {
  // The existing multi-wave recapture path is preserved; assembly does not delay it.
  expect(chooseAction(relayBoard(60), resolveAiBehavior('aggressive'))).toMatchObject({
    type: 'ground',
    kind: 'attack',
    targetId: 'relay',
  });
});

it('returns null when the faction has no second city to donate from', () => {
  const solo = createSimulation([
    city('only', 'enemy', 80, 100, 100),
    city('objective', 'neutral', 240, 180, 160),
  ]);
  expect(chooseAssembly(solo, resolveAiBehavior('aggressive'), 'enemy')).toBeNull();
});
