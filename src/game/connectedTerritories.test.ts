import { describe, expect, it } from 'vitest';
import { connectedTerritoryIds } from './connectedTerritories';
import { createRiver } from './river';
import type { Territory } from './types';

const cities: Territory[] = [
  { id: 'home', owner: 'player', units: 20, x: 90, y: 120 },
  { id: 'north', owner: 'player', units: 8, x: 220, y: 120 },
  { id: 'bridge-n', owner: 'player', units: 6, x: 180, y: 180 },
  { id: 'bridge-s', owner: 'player', units: 6, x: 180, y: 300 },
  { id: 'rear', owner: 'player', units: 4, x: 270, y: 300 },
  { id: 'cut-off', owner: 'player', units: 4, x: 300, y: 400 },
  { id: 'enemy', owner: 'enemy', units: 20, x: 90, y: 300 },
];

const river = createRiver({ top: 225, bottom: 255, bridges: [{ id: 'west', northId: 'bridge-n', southId: 'bridge-s', width: 60 }] }, cities);

describe('connected territory', () => {
  it('finds currently owned cities reachable from the faction home by legal routes', () => {
    expect([...connectedTerritoryIds(cities, 'player', 'home', river)]).toEqual([
      'home', 'north', 'bridge-n', 'bridge-s', 'rear', 'cut-off',
    ]);
  });

  it('drops cities disconnected by a captured link', () => {
    const split = cities.map(city => city.id === 'bridge-n' ? { ...city, owner: 'enemy' } : city);
    expect(connectedTerritoryIds(split, 'player', 'home', river)).toEqual(new Set(['home', 'north']));
  });

  it('has no connected group after the original home is lost', () => {
    const captured = cities.map(city => city.id === 'home' ? { ...city, owner: 'enemy' } : city);
    expect(connectedTerritoryIds(captured, 'player', 'home', river)).toEqual(new Set());
  });

  it('does not treat a city owned by another faction as part of the route chain', () => {
    const blocked = cities.map(city => city.id === 'bridge-n' ? { ...city, owner: 'enemy' } : city);
    expect([...connectedTerritoryIds(blocked, 'player', 'home', river)]).toEqual(['home', 'north']);
  });
});
