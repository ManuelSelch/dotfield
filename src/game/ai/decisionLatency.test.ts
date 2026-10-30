import { expect, it } from 'vitest';
import { generateMap } from '../../board/generateMap';
import { createSimulation } from '../state';
import { evaluateRound } from '../round';
import { createRules } from '../rules';
import { chooseAction } from './actions';
import { resolveAiBehavior } from './behaviors';
import { resetForecastCalls, forecastCallCount } from './forecast';
import type { SimulationState, Territory } from '../types';

/** Deterministic stand-in for a large mid-game board: a 30-city Courtyard with
 * Relay and city roles, split between the two factions. This is the shape that
 * made worker decisions take 10-18s; the guard keeps candidate enumeration from
 * regressing back to a full forecast for every source/target pair. */
function midgame(seed = 42): SimulationState {
  const settings = { layout: 'courtyard' as const, cities: 30, enemies: 1, industry: true, river: true, mountains: true, slowZone: false, relay: true };
  const map = generateMap(settings, seed);
  const territories: Territory[] = map.territories.map((city, index) => {
    const owner = index % 2 === 0 ? 'enemy' : 'player';
    const role = index % 7 === 0 ? 'artillery' as const : index % 5 === 0 ? 'defender' as const : undefined;
    return { ...city, owner, units: 24 + (index * 7) % 30, ...(role ? { cityType: role } : {}) };
  });
  const relayCityId = map.relay!.cityId;
  const withRelay = territories.map(city => city.id === relayCityId ? { ...city, owner: 'player' as const, units: 55 } : city);
  const sim = createSimulation(withRelay, createRules(), map.river, map.terrain, map.relay);
  return { ...evaluateRound(sim), elapsedMs: 200_000, relay: { ...map.relay!, scoresMs: { player: 90_000, enemy: 0 } } };
}

it.each([42, 7])('bounds a 30-city Courtyard+Relay decision (seed %i)', seed => {
  const state = midgame(seed);
  resetForecastCalls();
  const started = performance.now();
  chooseAction(state, resolveAiBehavior('aggressive'), 'enemy');
  const elapsed = performance.now() - started;
  expect(forecastCallCount()).toBeLessThan(200);
  expect(elapsed).toBeLessThan(6_000);
});
