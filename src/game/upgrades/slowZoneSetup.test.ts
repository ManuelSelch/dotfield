import { describe, expect, it } from 'vitest';
import { compileRoundSetup } from './compile';
import { createRules } from '../rules';
import { createSession } from '../session';
import { MAPS } from '../../board/maps';
import { minimumTravelMultiplier } from '../features/slowZone';
import { remainingTravelBound } from '../route';
import { createSimulation } from '../state';
import { dispatchUnits } from '../dispatch';
import { advanceRound } from '../round';
import { chooseOrder } from '../ai/decision';

const base = createRules();
describe('Slow Zone setup and lifecycle', () => {
  it.each(MAPS)('can place on every city of $id, including both starting cities', map => {
    const original = JSON.stringify(map.territories);
    for (let i = 0; i < map.territories.length; i++) {
      const setup = compileRoundSetup(map.territories, { player: ['slow-zone', 'slow-zone'] }, base,
        (i + 0.5) / map.territories.length);
      const hosts = setup.territories.filter(c => c.features?.some(f => f.kind === 'slow-zone'));
      expect(hosts).toHaveLength(1);
      expect(hosts[0].id).toBe(map.territories[i].id);
      expect(hosts[0].features).toEqual([...(map.territories[i].features ?? []), { id: `${hosts[0].id}:slow-zone:player`, kind: 'slow-zone', radius: 90, speedMultiplier: 0.5 }]);
      expect(Object.isFrozen(hosts[0].features![0])).toBe(true);
      expect(setup.rules).toEqual(base);
    }
    expect(JSON.stringify(map.territories)).toBe(original);
  });
  it('is reproducible and does not displace other starting features', () => {
    const a = compileRoundSetup(MAPS[0].territories, { player: ['slow-zone', 'watchtower', 'factory', 'industry'] }, base, 0.5);
    const b = compileRoundSetup(MAPS[0].territories, { player: ['industry', 'factory', 'watchtower', 'slow-zone'] }, base, 0.5);
    expect(a).toEqual(b);
    expect(a.territories.find(c => c.owner === 'player')!.features!.map(f => f.kind)).toEqual(['factory', 'watchtower']);
    expect(a.territories.find(c => c.features?.some(f => f.kind === 'slow-zone'))!.id).toBe(MAPS[0].territories[6].id);
  });
  it.each([-1, 1, Infinity, NaN])('rejects invalid random choice %s', choice => {
    expect(() => compileRoundSetup(MAPS[0].territories, { player: ['slow-zone'] }, base, choice)).toThrow();
  });
  it('keeps the host on restart, freezes paused/hidden movement, and resets travel', () => {
    const setup = compileRoundSetup(MAPS[0].territories, { player: ['slow-zone'] }, base, 0.5);
    const session = createSession(setup.territories, null, setup.rules);
    session.start(); session.dispatch('south', 'north'); session.frame(0); session.frame(2000);
    const snapshot = session.state;
    session.pause(); session.frame(60000); expect(session.state).toBe(snapshot);
    session.resume(); session.setHidden(true); session.frame(120000); expect(session.state).toBe(snapshot);
    session.restart(); expect(session.state.transfers).toEqual([]);
    expect(session.state.territories.map(c => c.features)).toEqual(setup.territories.map(c => c.features));
  });
});

describe('Slow Zone AI horizons', () => {
  it('bounds remaining flight separately from queued delay and actual flight age', () => {
    const setup = compileRoundSetup(MAPS[0].territories, { player: ['slow-zone'] }, base, 0.5);
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
      { id: 'n', owner: 'neutral' as const, units: 1, x: 200, y: 100,
        features: [{ id: 'z', kind: 'slow-zone' as const, radius: 90, speedMultiplier: 0.5 }] },
      { id: 'p', owner: 'player' as const, units: 100, x: 300, y: 400 },
    ];
    expect(chooseOrder(createSimulation(territories))).toMatchObject({ sourceId: 'e', targetId: 'n' });
  });
});
