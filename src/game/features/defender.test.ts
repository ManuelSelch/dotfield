import { describe, expect, it } from 'vitest';

import { convertCity } from '@/game/city-conversion';
import { resolveArrivalBatch } from '@/game/combat';
import { createSimulation } from '@/game/state';
import { advanceWorldStep } from '@/game/world-step';

import { advanceNetworkShields, shieldRechargeSource } from './network-shields';

function defender(network = false) {
  return createSimulation(
    Array.from({ length: 4 }, (_, i) => ({
      id: `c${i}`,
      owner: 'player',
      units: 40,
      x: 40 + i * 60,
      y: 100,
      cityType: i === 0 ? ('defender' as const) : ('production' as const),
    })),
    {
      factions: {
        player: {
          unitsPerSecond: 0,
          travelSpeed: 35,
          batchIntervalMs: 600,
          connectedDefense: network,
        },
      },
    },
  );
}
describe('Defender shields', () => {
  it('starts empty, recharges independently and caps at three', () => {
    const state = defender();
    expect(state.captureShields).toEqual({});
    expect(advanceWorldStep(state, 9999).captureShields.c0).toBeUndefined();
    expect(advanceWorldStep(state, 10000).captureShields.c0.remaining).toBe(1);
    expect(advanceWorldStep(state, 40000).captureShields.c0.remaining).toBe(3);
    expect(shieldRechargeSource(state, 'c0')).toEqual({ capacity: 3, source: 'defender' });
  });
  it('coordinates network and Defender without adding capacities or rates', () => {
    const state = defender(true);
    const next = advanceWorldStep(state, 10000);
    expect(next.captureShields.c0.remaining).toBe(1);
    expect(next.captureShields.c1.remaining).toBe(1);
    expect(advanceWorldStep(next, 30000).captureShields.c0.remaining).toBe(3);
  });
  it('resets old progress when a network changes capacity between physical updates', () => {
    const initial = defender(true);
    const seven = {
      ...initial,
      territories: [
        ...initial.territories.map((c) => ({ ...c, cityType: 'production' as const })),
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `extra${i}`,
          owner: 'neutral',
          units: 40,
          growthRemainder: 0,
          x: 40 + i * 60,
          y: 160,
          cityType: 'production' as const,
        })),
      ],
    };
    const partial = advanceWorldStep(seven, 5000);
    const expanded = {
      ...partial,
      territories: partial.territories.map((c) => ({ ...c, owner: 'player' })),
    };
    expect(advanceWorldStep(expanded, 5000).captureShields.c0).toBeUndefined();
    expect(advanceWorldStep(expanded, 10000).captureShields.c0.remaining).toBe(1);
  });
  it('resets recharge on each capture even if recaptured at the same timestamp', () => {
    const before = advanceWorldStep(defender(), 5000);
    const now = { ...before, elapsedMs: 5200 };
    // Faction rules are required for both capturing owners.
    const configured = {
      ...now,
      rules: { factions: { ...now.rules.factions, enemy: now.rules.factions.player } },
    };
    const lost = resolveArrivalBatch(configured, {
      targetId: 'c0',
      owner: 'enemy',
      units: 41,
    }).state;
    const back = resolveArrivalBatch(lost, { targetId: 'c0', owner: 'player', units: 2 }).state;
    expect(advanceNetworkShields(back, 200, before).networkShieldTimers?.c0.elapsedMs).toBe(0);
  });
  it('retains stored charges but resets partial recharge on conversion', () => {
    const state = advanceWorldStep(defender(), 15000);
    const converted = convertCity(state, 'c0', 'production');
    expect(converted.captureShields.c0.remaining).toBe(1);
    expect(advanceWorldStep(converted, 30000).captureShields.c0.remaining).toBe(1);
    expect(converted.networkShieldTimers?.c0).toBeUndefined();
  });
});
