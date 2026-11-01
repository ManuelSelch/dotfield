import { describe, expect, it } from 'vitest';

import { TERRITORIES } from '@/board/map';

import { forecastBattle } from './ai/forecast';
import { resolveCombat } from './combat';
import { dispatchUnits } from './dispatch';
import { advanceGrowth } from './growth';
import { BASE_FACTION_RULES } from './rules';
import { createSimulation } from './state';
import { advanceTravel } from './travel';
import { advanceWorldStep } from './world-step';

describe('unit growth', () => {
  it('grows both factions equally while leaving neutral defenders unchanged', () => {
    const initial = createSimulation(TERRITORIES);
    const next = advanceGrowth(initial, 3000);
    expect(next.elapsedMs).toBe(3000);
    next.territories.forEach((node, index) => {
      expect(node.units).toBe(
        initial.territories[index].units + (node.owner === 'neutral' ? 0 : 3),
      );
    });
    expect(initial.elapsedMs).toBe(0);
    expect(initial.territories[0].units).toBe(36);
  });

  it('carries partial growth until there is a whole unit', () => {
    const partial = advanceGrowth(createSimulation(TERRITORIES), 750);
    expect(partial.territories[0].units).toBe(36);
    expect(partial.territories[0].growthRemainder).toBe(750);
    const next = advanceGrowth(partial, 250);
    expect(next.territories[0].units).toBe(37);
    expect(next.territories[0].growthRemainder).toBe(0);
  });

  it.each([0, 0.25, 2.5])('supports a configurable rate of %s units/second', (rate) => {
    const state = advanceGrowth(createSimulation(TERRITORIES, { unitsPerSecond: rate }), 4000);
    expect(state.territories[0].units).toBe(36 + rate * 4);
  });

  it('matches one elapsed update and many fractional updates at a unit boundary', () => {
    const initial = createSimulation(TERRITORIES);
    let split = initial;
    for (let i = 0; i < 600; i++) split = advanceGrowth(split, 1000 / 60);
    const once = advanceGrowth(initial, 10000);
    expect(split.territories.map((node) => node.units)).toEqual(
      once.territories.map((node) => node.units),
    );
    expect(split.elapsedMs).toBeCloseTo(10000, 6);
    expect(split.territories[0].growthRemainder).toBeCloseTo(0, 6);
  });

  it.each(['player', 'enemy', 'enemy-2'] as const)(
    'caps %s production at 50 even during a large boosted update',
    (owner) => {
      const initial = createSimulation(
        TERRITORIES.map((node) => ({ ...node, owner, units: 49 })),
        {
          factions: { [owner]: { ...BASE_FACTION_RULES, unitsPerSecond: 2.5 } },
        },
      );
      const next = advanceGrowth(initial, 10000);
      expect(
        next.territories.every((node) => node.units === 50 && node.growthRemainder === 0),
      ).toBe(true);
      expect(initial.territories[0].units).toBe(49);
    },
  );

  it.each([50, 65])('does not produce or reduce troops at %i units', (units) => {
    const initial = createSimulation(TERRITORIES.map((node) => ({ ...node, units })));
    const next = advanceGrowth(initial, 10000);
    expect(next.territories.map((node) => node.units)).toEqual(
      initial.territories.map((node) => node.units),
    );
    expect(next.territories.every((node) => node.growthRemainder === 0)).toBe(true);
    expect(next.elapsedMs).toBe(10000);
  });

  it('discards fractional production at the cap and resumes normally after dispatch', () => {
    const initial = createSimulation(
      TERRITORIES.map((node) => (node.id === 'south' ? { ...node, units: 49 } : node)),
    );
    const capped = advanceGrowth(initial, 1750);
    expect(capped.territories.find((node) => node.id === 'south')).toMatchObject({
      units: 50,
      growthRemainder: 0,
    });
    const waiting = advanceGrowth(capped, 10000);
    const dispatched = dispatchUnits(waiting, 'south', 'centre');
    const resumed = advanceGrowth(dispatched, 750);
    expect(resumed.territories.find((node) => node.id === 'south')).toMatchObject({
      units: 45,
      growthRemainder: 750,
    });
    expect(
      advanceGrowth(resumed, 250).territories.find((node) => node.id === 'south'),
    ).toMatchObject({ units: 46, growthRemainder: 0 });
  });

  it('allows friendly arrivals above 50, but stops their destination producing', () => {
    const initial = createSimulation(
      TERRITORIES.map((node) =>
        node.id === 'centre' ? { ...node, owner: 'player', units: 45 } : node,
      ),
    );
    const reinforced = resolveCombat(
      advanceTravel(dispatchUnits(initial, 'south', 'centre'), 100000),
    );
    expect(reinforced.territories.find((node) => node.id === 'centre')?.units).toBe(80);
    expect(
      advanceGrowth(reinforced, 10000).territories.find((node) => node.id === 'centre'),
    ).toMatchObject({ units: 80, growthRemainder: 0 });
  });

  it('matches bulk, fixed-step and forecast production at the cap', () => {
    const initial = createSimulation(TERRITORIES, { unitsPerSecond: 2.5 });
    let split = initial;
    for (let i = 0; i < 201; i++) split = advanceWorldStep(split, 50);
    const once = advanceWorldStep(initial, 10050);
    expect(split.territories).toEqual(once.territories);
    expect(forecastBattle(initial, 10050).territories).toEqual(once.territories);
    expect(once.territories[0]).toMatchObject({ units: 50, growthRemainder: 0 });
  });

  it('keeps zero-time updates unchanged', () => {
    const state = createSimulation(TERRITORIES);
    expect(advanceGrowth(state, 0)).toBe(state);
  });

  it.each([-1, NaN, Infinity])('rejects invalid elapsed time: %s', (elapsedMs) => {
    expect(() => advanceGrowth(createSimulation(TERRITORIES), elapsedMs)).toThrow(RangeError);
  });
});
