import { describe, expect, it } from 'vitest';

import { createSession } from './session';
import { createSimulation } from './state';
import type { Territory } from './types';
import { advanceWorldStep } from './world-step';
const cities: Territory[] = [
  { id: 'home', owner: 'player', units: 140, x: 60, y: 300 },
  { id: 'away', owner: 'enemy', units: 80, x: 280, y: 80 },
];

describe('city session commands', () => {
  it('permits conversion only in an active session and restarts the exact opening', () => {
    const session = createSession(cities, null, { unitsPerSecond: 0 });
    const initial = session.state;
    expect(session.convert('home', 'airfield')).toBe(initial);
    session.start();
    expect(session.convert('home', 'airfield').territories[0]).toMatchObject({
      cityType: 'airfield',
      units: 110,
    });
    session.pause();
    const paused = session.state;
    expect(session.convert('home', 'production')).toBe(paused);
    session.resume();
    session.setHidden(true);
    expect(session.convert('home', 'production')).toBe(paused);
    session.setHidden(false);
    session.restart();
    expect(session.state.territories[0].cityType ?? 'production').toBe('production');
    expect(session.state.territories[0].units).toBe(140);
    expect(session.state.aircraft).toEqual({});
  });
  it('launches only while active and with a ready airplane, without closed-time progress', () => {
    let opening = createSimulation(
      cities.map((c) => (c.id === 'home' ? { ...c, cityType: 'airfield' } : c)),
      { unitsPerSecond: 0 },
    );
    opening = advanceWorldStep(opening, 20_000);
    const session = createSession(
      cities,
      null,
      { unitsPerSecond: 0 },
      { initialState: opening, initialPhase: 'paused' },
    );
    expect(session.fly('home', 'away')).toBe(opening);
    session.resume();
    session.setHidden(true);
    expect(session.fly('home', 'away')).toBe(opening);
    session.setHidden(false);
    expect(session.fly('home', 'away').aircraft?.home).toMatchObject({
      phase: 'outbound',
      cargo: 100,
    });
    session.pause();
    const paused = session.state;
    session.frame(1_000_000);
    expect(session.state).toBe(paused);
    expect(session.fly('home', 'away')).toBe(paused);
    session.resume();
    session.frame(1_000_050);
    expect(session.state.aircraft?.home?.elapsedMs).toBe(0);
  });
  it('applies worker conversion actions through active faction commands and revalidates stale resources', () => {
    const session = createSession(cities, null, { unitsPerSecond: 0 });
    const action = {
      type: 'convert' as const,
      cityId: 'away',
      cityType: 'airfield' as const,
      score: 10,
    };
    const initial = session.state;
    expect(session.applyFactionAction(action, 'enemy')).toBe(initial);
    session.start();
    expect(session.applyFactionAction(action, 'enemy').territories[1]).toMatchObject({
      cityType: 'airfield',
      units: 50,
    });
    const converted = session.state;
    expect(session.applyFactionAction(action, 'enemy')).toBe(converted);
    session.pause();
    expect(session.applyFactionAction({ ...action, cityType: 'production' }, 'enemy')).toBe(
      converted,
    );
  });
  it('never lets player controls convert or launch from an enemy city', () => {
    const session = createSession(cities, null, { unitsPerSecond: 0 });
    session.start();
    const initial = session.state;
    expect(session.convert('away', 'airfield')).toBe(initial);
    expect(session.fly('away', 'home')).toBe(initial);
  });
});
