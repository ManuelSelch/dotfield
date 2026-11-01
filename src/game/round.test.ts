import { describe, expect, it } from 'vitest';

import { dispatchUnits } from './dispatch';
import { advanceGrowth } from './growth';
import { evaluateRound, advanceRound } from './round';
import { createSimulation } from './state';
import { advanceTravel } from './travel';

const map = [
  { id: 'player', owner: 'player' as const, units: 20, x: 0, y: 0 },
  { id: 'enemy', owner: 'enemy' as const, units: 3, x: 200, y: 0 },
];

describe('round outcomes', () => {
  it('remains active when both factions own territories, including empty ones', () => {
    const state = createSimulation(map.map((n) => ({ ...n, units: 0 })));
    expect(evaluateRound(state)).toBe(state);
  });
  it('declares victory when only player remains, ignoring neutrals', () => {
    const state = createSimulation([map[0], { ...map[1], owner: 'neutral' }]);
    expect(evaluateRound(state).roundStatus).toBe('victory');
  });
  it('declares defeat when only enemy remains', () => {
    expect(evaluateRound(createSimulation([map[1]])).roundStatus).toBe('defeat');
  });
  it('declares a draw if neither faction can recover', () => {
    expect(evaluateRound(createSimulation([])).roundStatus).toBe('draw');
  });
  it('does not count unlaunched troops as survivors after their source is lost', () => {
    const sent = dispatchUnits(createSimulation(map), 'player', 'enemy');
    const state = {
      ...sent,
      territories: sent.territories.filter((n) => n.owner !== 'player'),
      transfers: sent.transfers.filter((t) => t.elapsedMs < 0),
    };
    expect(evaluateRound(state).roundStatus).toBe('defeat');
  });
  it.each([0, 100])('counts airborne troops after the last region is lost (%i ms)', (elapsedMs) => {
    const sent = dispatchUnits(createSimulation(map), 'player', 'enemy');
    const state = {
      ...sent,
      territories: sent.territories.filter((n) => n.owner !== 'player'),
      transfers: sent.transfers.map((t) => ({ ...t, elapsedMs })),
    };
    expect(evaluateRound(state).roundStatus).toBe('playing');
    const recovered = advanceRound(state, 10000);
    expect(recovered.roundStatus).toBe('victory');
    expect(recovered.territories[0].owner).toBe('player');
  });
  it('counts enemy troops in transit and unresolved arrivals', () => {
    const sent = dispatchUnits(createSimulation(map), 'player', 'enemy');
    const enemyTroops = sent.transfers.map((t) => ({ ...t, owner: 'enemy' as const }));
    const state = { ...sent, territories: [sent.territories[0]], transfers: enemyTroops };
    expect(evaluateRound(state).roundStatus).toBe('playing');
    expect(evaluateRound({ ...state, transfers: [], arrivals: enemyTroops }).roundStatus).toBe(
      'playing',
    );
  });
  it('finishes on capture, not while attacking units are still approaching', () => {
    let state = dispatchUnits(createSimulation(map, { unitsPerSecond: 0 }), 'player', 'enemy');
    const duration = state.transfers[0].durationMs;
    expect(advanceRound(state, duration - 1).roundStatus).toBe('playing');
    state = advanceRound(state, duration);
    expect(state.roundStatus).toBe('victory');
    expect(state.transfers).toHaveLength(3); // Remaining player batches freeze on victory.
    expect(state.territories[1]).toMatchObject({ owner: 'player', units: 2 });
  });
  it('freezes time, growth, troops and new orders after round end', () => {
    const ended = evaluateRound(
      createSimulation(map.map((n) => ({ ...n, owner: 'player' as const }))),
    );
    expect(advanceRound(ended, 10000)).toBe(ended);
    expect(advanceGrowth(ended, 10000)).toBe(ended);
    expect(advanceTravel(ended, 10000)).toBe(ended);
    expect(dispatchUnits(ended, 'player', 'enemy')).toBe(ended);
  });
  it('starts a fresh round with no old orders, outcome, time or fractional growth', () => {
    const old = advanceRound(dispatchUnits(createSimulation(map), 'player', 'enemy'), 10000);
    expect(old.roundStatus).toBe('victory');
    const fresh = createSimulation(map);
    expect(fresh).toMatchObject({
      roundStatus: 'playing',
      elapsedMs: 0,
      transfers: [],
      arrivals: [],
      nextTransferId: 1,
    });
    expect(fresh.territories.map((n) => n.units)).toEqual([20, 3]);
    expect(fresh.territories.every((n) => n.growthRemainder === 0)).toBe(true);
  });
  it('matches small updates when a large elapsed interval crosses round end', () => {
    const initial = dispatchUnits(createSimulation(map, { unitsPerSecond: 0 }), 'player', 'enemy');
    const bulk = advanceRound(initial, 10000);
    let stepped = initial;
    for (let i = 0; i < 200; i++) stepped = advanceRound(stepped, 50);
    expect(bulk).toEqual(stepped);
  });
});
