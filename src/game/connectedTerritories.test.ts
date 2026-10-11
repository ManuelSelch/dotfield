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
  it('finds currently owned cities linked to the faction home through shared borders', () => {
    expect([...connectedTerritoryIds(cities, 'player', 'home', river)]).toEqual([
      'home', 'north', 'bridge-n', 'bridge-s', 'rear', 'cut-off',
    ]);
  });

  it('drops cities disconnected by a captured link', () => {
    const split = cities.map(city => city.id === 'bridge-n' ? { ...city, owner: 'enemy' } : city);
    expect(connectedTerritoryIds(split, 'player', 'home', river)).toEqual(new Set(['home', 'north']));
  });

  it('requires a shared-border chain instead of any legal direct order', () => {
    const line: Territory[] = [
      { id: 'home', owner: 'player', units: 10, x: 60, y: 240 },
      { id: 'neutral-link', owner: 'neutral', units: 10, x: 180, y: 240 },
      { id: 'distant', owner: 'player', units: 10, x: 300, y: 240 },
    ];
    expect(connectedTerritoryIds(line, 'player', 'home')).toEqual(new Set(['home']));
    const capturedLink = line.map(city => city.id === 'neutral-link' ? { ...city, owner: 'player' } : city);
    expect(connectedTerritoryIds(capturedLink, 'player', 'home')).toEqual(new Set(['home', 'neutral-link', 'distant']));
  });

  it('has no connected group after the original home is lost', () => {
    const captured = cities.map(city => city.id === 'home' ? { ...city, owner: 'enemy' } : city);
    expect(connectedTerritoryIds(captured, 'player', 'home', river)).toEqual(new Set());
  });

  it('does not treat a city owned by another faction as a border link', () => {
    const blocked = cities.map(city => city.id === 'bridge-n' ? { ...city, owner: 'enemy' } : city);
    expect([...connectedTerritoryIds(blocked, 'player', 'home', river)]).toEqual(['home', 'north']);
  });
});
