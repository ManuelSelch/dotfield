import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { dispatchUnits } from './dispatch';
import { getTroopComposition } from './troopComposition';
import { TERRITORIES } from '../board/map';

const share = (state: ReturnType<typeof createSimulation>, owner: 'player' | 'neutral' | 'enemy') =>
  getTroopComposition(state).find(item => item.owner === owner)!;

describe('getTroopComposition', () => {
  it('aggregates garrisons by owner and derives shares of the total', () => {
    const state = createSimulation([
      { id: 'p', owner: 'player', units: 10, x: 0, y: 0 },
      { id: 'n', owner: 'neutral', units: 20, x: 100, y: 0 },
      { id: 'e', owner: 'enemy', units: 10, x: 200, y: 0 },
    ]);
    expect(getTroopComposition(state)).toEqual([
      { owner: 'player', units: 10, percentage: 25 },
      { owner: 'neutral', units: 20, percentage: 50 },
      { owner: 'enemy', units: 10, percentage: 25 },
    ]);
  });

  it('counts airborne troops once and does not double-count queued reservations', () => {
    const ordered = dispatchUnits(createSimulation(TERRITORIES), 'south', 'centre');
    const composition = getTroopComposition(ordered);
    expect(share(ordered, 'player').units).toBe(36);
    expect(composition.reduce((sum, item) => sum + item.units, 0)).toBe(188);
  });

  it('includes every enemy faction in the composition', () => {
    const state = createSimulation([
      { id: 'p', owner: 'player', units: 10, x: 0, y: 0 },
      { id: 'west', owner: 'enemy', units: 20, x: 100, y: 0 },
      { id: 'east', owner: 'enemy-2', units: 30, x: 200, y: 0 },
    ]);

    const composition = getTroopComposition(state);
    expect(composition.map(({ owner, units }) => ({ owner, units }))).toEqual([
      { owner: 'player', units: 10 },
      { owner: 'neutral', units: 0 },
      { owner: 'enemy', units: 20 },
      { owner: 'enemy-2', units: 30 },
    ]);
    expect(composition.map(item => item.percentage)).toEqual([
      expect.closeTo(100 / 6, 10), 0, expect.closeTo(200 / 6, 10), 50,
    ]);
  });

  it('handles a zero-total state without NaN percentages', () => {
    const empty = createSimulation([]);
    expect(getTroopComposition(empty)).toEqual([
      { owner: 'player', units: 0, percentage: 0 },
      { owner: 'neutral', units: 0, percentage: 0 },
      { owner: 'enemy', units: 0, percentage: 0 },
    ]);
  });
});
