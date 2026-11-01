import { describe, expect, it } from 'vitest';

import { MAPS } from '@/board/maps';
import { chooseOrder } from '@/game/ai/decision';
import { dispatchUnits } from '@/game/dispatch';
import { minimumTravelMultiplier } from '@/game/features/slow-zone';
import { advanceRound } from '@/game/round';
import { remainingTravelBound } from '@/game/route';
import { createRules } from '@/game/rules';
import { createSession } from '@/game/session';
import { createSimulation } from '@/game/state';

import { compileRoundSetup } from './compile';

const base = createRules();
const setupWithZone = (territories = MAPS[0].territories, index = 6) =>
  compileRoundSetup(
    territories.map((city, i) =>
      i === index
        ? {
            ...city,
            features: [
              ...(city.features ?? []),
              {
                id: `${city.id}:slow-zone`,
                kind: 'slow-zone' as const,
                radius: 150,
                speedMultiplier: 0.5,
              },
            ],
          }
        : city,
    ),
    {},
    base,
  );
describe('Slow Zone setup and lifecycle', () => {
  it.each(MAPS)('preserves one authored random-city Slow Zone on $id', (map) => {
    const source = map.territories.map((city, i) =>
      i === 0
        ? {
            ...city,
            features: [
              {
                id: `${city.id}:slow-zone`,
                kind: 'slow-zone' as const,
                radius: 150,
                speedMultiplier: 0.5,
              },
            ],
          }
        : city,
    );
    const setup = compileRoundSetup(source, {}, base);
    const hosts = setup.territories.filter((c) => c.features?.some((f) => f.kind === 'slow-zone'));
    expect(hosts).toHaveLength(1);
    expect(hosts[0].features).toEqual(source[0].features);
    expect(Object.isFrozen(hosts[0].features![0])).toBe(true);
    expect(setup.rules).toEqual(base);
    expect(map.territories[0].features).toBeUndefined();
  });
  it('keeps field features independent from faction upgrades', () => {
    const authored = MAPS[0].territories.map((city, i) =>
      city.owner === 'player'
        ? {
            ...city,
            features: [
              {
                id: 'start:watchtower',
                kind: 'watchtower' as const,
                range: 150,
                fireIntervalMs: 250,
              },
            ],
          }
        : i === 6
          ? {
              ...city,
              features: [
                {
                  id: 'zone:slow-zone',
                  kind: 'slow-zone' as const,
                  radius: 150,
                  speedMultiplier: 0.5,
                },
              ],
            }
          : city,
    );
    const a = compileRoundSetup(authored, { player: ['factory', 'industry'] }, base);
    const b = compileRoundSetup(authored, { player: ['industry', 'factory'] }, base);
    expect(a).toEqual(b);
    expect(a.territories.find((c) => c.owner === 'player')).toMatchObject({
      cityType: 'watchtower',
      features: [expect.objectContaining({ kind: 'factory' })],
    });
    expect(a.territories.find((c) => c.features?.some((f) => f.kind === 'slow-zone'))!.id).toBe(
      MAPS[0].territories[6].id,
    );
  });
  it('keeps the host on restart, freezes paused/hidden movement, and resets travel', () => {
    const setup = setupWithZone();
    const session = createSession(setup.territories, null, setup.rules);
    session.start();
    session.dispatch('south', 'north');
    session.frame(0);
    session.frame(2000);
    const snapshot = session.state;
    session.pause();
    session.frame(60000);
    expect(session.state).toBe(snapshot);
    session.resume();
    session.setHidden(true);
    session.frame(120000);
    expect(session.state).toBe(snapshot);
    session.restart();
    expect(session.state.transfers).toEqual([]);
    expect(session.state.territories.map((c) => c.features)).toEqual(
      setup.territories.map((c) => c.features),
    );
  });
});

describe('Slow Zone AI horizons', () => {
  it('bounds remaining flight separately from queued delay and actual flight age', () => {
    const setup = setupWithZone();
    const sent = dispatchUnits(createSimulation(setup.territories, setup.rules), 'south', 'north');
    expect(minimumTravelMultiplier(sent)).toBe(0.5);
    const next = advanceRound(sent, 2000);
    const t = next.transfers[0];
    expect(remainingTravelBound(t, 0.5)).toBeCloseTo((t.durationMs - t.traveledMs!) / 0.5);
    const queued = sent.transfers[1];
    expect(remainingTravelBound(queued, 0.5)).toBeCloseTo(600 + queued.durationMs / 0.5);
  });
  it('evaluates an expansion through a slowed final arrival rather than stopping early', () => {
    const territories = [
      { id: 'e', owner: 'enemy' as const, units: 15, x: 100, y: 100 },
      {
        id: 'n',
        owner: 'neutral' as const,
        units: 1,
        x: 200,
        y: 100,
        features: [{ id: 'z', kind: 'slow-zone' as const, radius: 150, speedMultiplier: 0.5 }],
      },
      { id: 'p', owner: 'player' as const, units: 100, x: 300, y: 400 },
    ];
    expect(chooseOrder(createSimulation(territories))).toMatchObject({
      sourceId: 'e',
      targetId: 'n',
    });
  });
});
