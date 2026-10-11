import { describe, expect, it } from 'vitest';
import { connectedDefenseCapacities, getConnectedDefenseTier } from './connectedDefense';
import { createSimulation } from './state';
import { compileRoundSetup } from './upgrades/compile';
import type { Territory } from './types';

function network(size: number, selected = true) {
  const territories: Territory[] = Array.from({ length: size }, (_, index) => ({
    id: index === 0 ? 'home' : `city-${index}`, owner: 'player', units: 10,
    x: 40 + index * 45, y: 80,
  }));
  territories.push({ id: 'enemy', owner: 'enemy', units: 10, x: 40, y: 180 });
  const setup = compileRoundSetup(territories, selected ? { player: ['defensive-network'] } : { player: [] });
  return createSimulation(setup.territories, setup.rules, setup.river, setup.terrain);
}

describe('connected defense tiers', () => {
  it.each([{ size: 1, tier: 0 }, { size: 2, tier: 1 }, { size: 3, tier: 1 },
    { size: 4, tier: 2 }, { size: 6, tier: 2 }, { size: 7, tier: 3 }, { size: 12, tier: 3 }])(
    'assigns tier $tier to a connected group of $size cities', ({ size, tier }) => {
      const state = network(size);
      expect(getConnectedDefenseTier(state, state.territories[0])).toBe(tier);
    });

  it('reports shield storage capacity for each connected upgraded city', () => {
    const state = network(4);
    expect(connectedDefenseCapacities(state)).toEqual(new Map([
      ['home', 2], ['city-1', 2], ['city-2', 2], ['city-3', 2],
    ]));
  });

  it('compiles the upgrade independently for each faction', () => {
    const territories: Territory[] = [
      { id: 'home', owner: 'player', units: 10, x: 60, y: 100 },
      { id: 'enemy-home', owner: 'enemy', units: 10, x: 60, y: 300 },
    ];
    const setup = compileRoundSetup(territories, { player: ['defensive-network'], enemy: [] });
    expect(setup.rules.factions.player.connectedDefense).toBe(true);
    expect(setup.rules.factions.enemy.connectedDefense).toBe(false);
  });

  it('does not grant a tier if the upgrade is not selected', () => {
    const state = network(7, false);
    expect(getConnectedDefenseTier(state, state.territories[0])).toBe(0);
  });

  it('does not protect neutral, enemy, or disconnected cities', () => {
    const state = network(4);
    expect(getConnectedDefenseTier(state, state.territories.at(-1)!)).toBe(0);
    const territories: Territory[] = [
      { id: 'home', owner: 'player', units: 10, x: 100, y: 100 },
      { id: 'bridge-n', owner: 'player', units: 10, x: 180, y: 180 },
      { id: 'bridge-s', owner: 'player', units: 10, x: 180, y: 300 },
      { id: 'rear', owner: 'player', units: 10, x: 260, y: 300 },
      { id: 'enemy', owner: 'enemy', units: 10, x: 80, y: 340 },
    ];
    const river = { top: 225, bottom: 255, bridges: [{ id: 'crossing', northId: 'bridge-n', southId: 'bridge-s', width: 60 }] };
    const setup = compileRoundSetup(territories, { player: ['defensive-network'] }, undefined, {}, river);
    const split = createSimulation(setup.territories, setup.rules, river);
    const captured = { ...split, territories: split.territories.map(city => city.id === 'bridge-n'
      ? { ...city, owner: 'enemy' } : city) };
    expect(getConnectedDefenseTier(captured, captured.territories.find(city => city.id === 'rear')!)).toBe(0);
  });
});
