import { describe, expect, it } from 'vitest';

import { snapshotTerritories } from './snapshot';

describe('snapshot territory role migration', () => {
  it('promotes legacy attached Watchtower or Artillery to an exclusive city role', () => {
    const oldTower = {
      id: 'tower-feature',
      kind: 'watchtower' as const,
      range: 150,
      fireIntervalMs: 250,
    };
    const oldGun = {
      id: 'gun-feature',
      kind: 'artillery' as const,
      range: 150,
      fireIntervalMs: 1000 / 3,
    };
    const result = snapshotTerritories([
      { id: 'tower', owner: 'player', x: 0, y: 0, units: 20, features: [oldTower] },
      {
        id: 'gun',
        owner: 'enemy',
        x: 1,
        y: 1,
        units: 20,
        cityType: 'production',
        features: [oldGun],
      },
    ]);
    expect(result.map((city) => [city.cityType, city.features])).toEqual([
      ['watchtower', []],
      ['artillery', []],
    ]);
  });
  it('keeps nonweapon attachments and explicit nonproduction role, dropping conflicting legacy weapons', () => {
    const result = snapshotTerritories([
      {
        id: 'x',
        owner: 'player',
        x: 0,
        y: 0,
        units: 30,
        cityType: 'airfield',
        features: [
          { id: 'factory', kind: 'factory', productionMultiplier: 2 },
          { id: 'tower', kind: 'watchtower', range: 150, fireIntervalMs: 250 },
          { id: 'gun', kind: 'artillery', range: 150, fireIntervalMs: 1000 / 3 },
          { id: 'slow', kind: 'slow-zone', radius: 100, speedMultiplier: 0.5 },
        ],
      },
    ]);
    expect(result[0].cityType).toBe('airfield');
    expect(result[0].features?.map((feature) => feature.kind)).toEqual(['factory', 'slow-zone']);
  });
  it('uses Artillery as stable precedence for ambiguous legacy dual-weapon cities', () => {
    const result = snapshotTerritories([
      {
        id: 'x',
        owner: 'player',
        x: 0,
        y: 0,
        units: 30,
        features: [
          { id: 'tower', kind: 'watchtower', range: 150, fireIntervalMs: 250 },
          { id: 'gun', kind: 'artillery', range: 150, fireIntervalMs: 1000 / 3 },
        ],
      },
    ]);
    expect(result[0].cityType).toBe('artillery');
    expect(result[0].features).toEqual([]);
  });
});
