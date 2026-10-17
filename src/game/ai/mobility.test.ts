import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_SETTINGS, generateMap } from '../../board/generateMap';
import { compileRoundSetup } from '../upgrades/compile';
import { createSimulation } from '../state';
import { dispatchUnits } from '../dispatch';
import { createTerrain } from '../terrain/terrain';
import { createRiver } from '../river';
import type { Territory } from '../types';
import { chooseAction } from './actions';
import { resolveAiBehavior } from './behaviors';
import { forecastBattle } from './forecast';
import { keepsHomeReserve } from './mobility';

const city = (id: string, owner: string, units: number, x: number, y = 0): Territory => ({ id, owner, units, x, y });
function networkState(cities: readonly Territory[], terrain?: ReturnType<typeof createTerrain>, river?: ReturnType<typeof createRiver>) {
  const setup = compileRoundSetup(cities, { enemy: ['defensive-network'] }, undefined, undefined, river, terrain);
  return createSimulation(setup.territories, setup.rules, setup.river, setup.terrain);
}
const opening = [city('home', 'enemy', 36, 0), city('neutral', 'neutral', 10, -80)];

describe('threat-aware network home protection', () => {
  it.each(['balanced', 'aggressive', 'defensive'] as const)('%s expands at its first decision on Courtyard with Defensive Network', behavior => {
    for (const cities of [20, 30]) for (const seed of [42, 99]) {
      const map = generateMap({ ...DEFAULT_MAP_SETTINGS, layout: 'courtyard', cities, enemies: 1 }, seed);
      const state = networkState(map.territories, map.terrain, map.river);
      const config = resolveAiBehavior(behavior);
      const action = chooseAction(forecastBattle(state, config.initialDelayMs), config);
      expect(action).toMatchObject({ type: 'ground', sourceId: 'home-enemy', kind: 'expand' });
    }
  });

  it('allows all-but-one expansion when the home is safe, without waiting for four connected cities', () => {
    const state = networkState([...opening, city('player', 'player', 80, 500)]);
    const dispatched = dispatchUnits(state, 'home', 'neutral', 'enemy');
    expect(keepsHomeReserve(state, dispatched, 'enemy')).toBe(true);
    expect(keepsHomeReserve(forecastBattle(state, 6000), forecastBattle(dispatched, 6000), 'enemy')).toBe(true);
  });

  it('rejects draining home against an available nearby army, even one smaller than twelve troops', () => {
    const state = networkState([...opening, city('player', 'player', 8, 100)]);
    expect(keepsHomeReserve(state, dispatchUnits(state, 'home', 'neutral', 'enemy'), 'enemy')).toBe(false);
  });

  it('does not reject an unchanged home or a reinforcement just because an enemy is nearby', () => {
    const state = networkState([...opening, city('rear', 'enemy', 36, -160), city('player', 'player', 80, 100)]);
    expect(keepsHomeReserve(state, state, 'enemy')).toBe(true);
    expect(keepsHomeReserve(state, dispatchUnits(state, 'rear', 'home', 'enemy'), 'enemy')).toBe(true);
  });

  it('does not treat an army across a mountain as a direct home threat', () => {
    const terrain = createTerrain({ bounds: { minX: -200, minY: -200, maxX: 600, maxY: 600 }, crossings: [],
      barriers: [{ id: 'ridge', kind: 'mountain', bounds: { minX: 30, minY: -150, maxX: 40, maxY: 150 } }] });
    const state = networkState([...opening, city('player', 'player', 80, 100)], terrain);
    expect(keepsHomeReserve(state, dispatchUnits(state, 'home', 'neutral', 'enemy'), 'enemy')).toBe(true);
  });

  it('does not treat an army across an unpaired river as a direct home threat', () => {
    const nodes = [city('home', 'enemy', 36, 80, 100), city('neutral', 'neutral', 10, 80, 40),
      city('player', 'player', 80, 80, 300), city('north', 'neutral', 10, 280, 190), city('south', 'neutral', 10, 280, 290)];
    const river = createRiver({ top: 225, bottom: 255,
      bridges: [{ id: 'bridge', northId: 'north', southId: 'south', width: 64 }] }, nodes);
    const state = networkState(nodes, undefined, river);
    expect(keepsHomeReserve(state, dispatchUnits(state, 'home', 'neutral', 'enemy'), 'enemy')).toBe(true);
  });

  it('still rejects forecast home loss from an already committed attack', () => {
    let state = networkState([...opening, city('player', 'player', 100, 200)]);
    state = dispatchUnits(state, 'player', 'home', 'player');
    const lost = forecastBattle(state, 20000);
    expect(lost.territories.find(c => c.id === 'home')?.owner).toBe('player');
    expect(keepsHomeReserve(state, lost, 'enemy')).toBe(false);
  });
});
