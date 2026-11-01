import { describe, expect, it } from 'vitest';

import { TERRITORIES } from '@/board/map';
import { createClock } from '@/game/clock';
import { advanceRound } from '@/game/round';
import { createSimulation } from '@/game/state';

import { DEFAULT_AI } from './config';

const config = { ...DEFAULT_AI, initialDelayMs: 1000, decisionIntervalMs: 1000 };

describe('simulation-time enemy decisions', () => {
  it('starts after the configured delay and spends actual enemy units', () => {
    const state = createSimulation(TERRITORIES);
    const waiting = advanceRound(state, 950, config);
    expect(waiting.transfers).toEqual([]);
    const acting = advanceRound(waiting, 50, config);
    expect(acting.transfers.length).toBeGreaterThan(0);
    expect(acting.transfers.every((t) => t.owner === 'enemy')).toBe(true);
    expect(acting.territories[0].units).toBe(32); // 36 + 1 growth - first group of 5.
    expect(acting.aiNextDecisionMs).toBe(2000);
    expect(state.transfers).toEqual([]);
  });
  it('can be disabled without affecting simulation growth', () => {
    const state = advanceRound(createSimulation(TERRITORIES), 10000, null);
    expect(state.transfers).toEqual([]);
    expect(state.territories[0].units).toBe(46);
  });
  it('matches one large update and repeated fixed updates', () => {
    const state = createSimulation(TERRITORIES);
    const bulk = advanceRound(state, 20000, config);
    let stepped = state;
    for (let i = 0; i < 400; i++) stepped = advanceRound(stepped, 50, config);
    expect(bulk).toEqual(stepped);
  });
  it.each([30, 60, 120])('makes identical decisions at %i rendering frames per second', (fps) => {
    const clock = createClock();
    let state = createSimulation(TERRITORIES);
    for (let frame = 0; frame <= fps * 10; frame++)
      state = advanceRound(state, clock.advance((frame * 1000) / fps), config);

    expect(state).toEqual(advanceRound(createSimulation(TERRITORIES), 10000, config));
  });
  it('does not issue orders once a round is over and resets its deadline on replay', () => {
    const initial = createSimulation(TERRITORIES);
    const active = advanceRound(initial, 1000, config);
    const ended = { ...active, roundStatus: 'victory' as const };
    expect(advanceRound(ended, 10000, config)).toBe(ended);
    const replay = createSimulation(TERRITORIES);
    expect(replay.aiNextDecisionMs).toBeNull();
    expect(advanceRound(replay, 950, config).transfers).toEqual([]);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid decision interval %s', (interval) => {
    expect(() =>
      advanceRound(createSimulation(TERRITORIES), 50, { ...config, decisionIntervalMs: interval }),
    ).toThrow(RangeError);
  });
  it('can defeat an idle player on the fixed map using normal resources', () => {
    const result = advanceRound(createSimulation(TERRITORIES), 180000, DEFAULT_AI);
    expect(result.roundStatus).toBe('defeat');
    expect(result.elapsedMs).toBeLessThan(120000);
  });
});
