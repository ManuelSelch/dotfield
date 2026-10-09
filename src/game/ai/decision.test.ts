import { describe, expect, it } from 'vitest';
import { createSimulation } from '../state';
import { dispatchUnits } from '../dispatch';
import { chooseOrder } from './decision';
import type { Territory } from '../types';

const node = (id: string, owner: Territory['owner'], units: number, x: number, y = 0): Territory => ({ id, owner, units, x, y });
const state = (...nodes: Territory[]) => createSimulation(nodes, { unitsPerSecond: 0 });

describe('basic enemy policy', () => {
  it('expands toward a capturable neutral and avoids an impossible attack', () => {
    const game = state(node('base', 'enemy', 20, 0), node('neutral', 'neutral', 6, 120), node('player', 'player', 80, 300));
    expect(chooseOrder(game)).toMatchObject({ sourceId: 'base', targetId: 'neutral', kind: 'expand' });
  });
  it('attacks a vulnerable player while ahead', () => {
    expect(chooseOrder(state(node('base', 'enemy', 30, 0), node('player', 'player', 5, 120))))
      .toMatchObject({ sourceId: 'base', targetId: 'player', kind: 'attack' });
  });
  it('continues meaningful expansion while nearly defeated', () => {
    expect(chooseOrder(state(node('base', 'enemy', 8, 0), node('neutral', 'neutral', 2, 100), node('player', 'player', 100, 300))))
      .toMatchObject({ targetId: 'neutral', kind: 'expand' });
  });
  it('waits instead of sending clearly insufficient attacks', () => {
    expect(chooseOrder(state(node('base', 'enemy', 7, 0), node('player', 'player', 30, 120)))).toBeNull();
  });
  it('accounts for enemy growth during travel, not just the current count', () => {
    const game = createSimulation([node('base', 'enemy', 10, 0), node('player', 'player', 8, 500)]);
    expect(chooseOrder(game)).toBeNull();
  });
  it('does not duplicate an existing successful capture or spend a busy source', () => {
    const game = state(node('base', 'enemy', 20, 0), node('other', 'enemy', 20, 100), node('neutral', 'neutral', 2, 200), node('player', 'player', 100, 1000));
    const ordered = dispatchUnits(game, 'base', 'neutral', 'enemy');
    expect(chooseOrder(ordered)).toBeNull();
  });
  it('reinforces a threatened friendly region in time to prevent capture', () => {
    let game = state(node('base', 'enemy', 20, 0), node('front', 'enemy', 3, 100), node('player', 'player', 16, 500));
    game = dispatchUnits(game, 'player', 'front');
    expect(chooseOrder(game)).toMatchObject({ sourceId: 'base', targetId: 'front', kind: 'reinforce' });
  });
  it('moves reserves forward instead of endlessly shuffling between friendly regions', () => {
    expect(chooseOrder(state(node('back', 'enemy', 20, 0), node('front', 'enemy', 2, 200), node('player', 'player', 100, 400))))
      .toMatchObject({ sourceId: 'back', targetId: 'front', kind: 'reinforce' });
  });
  it('concentrates armies at the frontline when individual regions cannot beat the player', () => {
    expect(chooseOrder(state(node('back', 'enemy', 30, 0), node('front', 'enemy', 40, 200), node('player', 'player', 60, 400))))
      .toMatchObject({ sourceId: 'back', targetId: 'front', kind: 'reinforce' });
  });
  it('does not abandon a source that an incoming attack would otherwise fail to capture', () => {
    let game = state(node('base', 'enemy', 20, 0), node('neutral', 'neutral', 2, -300), node('player', 'player', 15, 200));
    game = dispatchUnits(game, 'player', 'base');
    expect(chooseOrder(game)).toBeNull();
  });
  it('is deterministic and does not mutate the simulation', () => {
    const game = state(node('base', 'enemy', 20, 0), node('neutral', 'neutral', 6, 120), node('player', 'player', 80, 300));
    const snapshot = structuredClone(game);
    expect(chooseOrder(game)).toEqual(chooseOrder(game));
    expect(game).toEqual(snapshot);
    expect(chooseOrder({ ...game, roundStatus: 'victory' })).toBeNull();
  });
});
