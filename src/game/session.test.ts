import { describe, expect, it } from 'vitest';

import { DEFAULT_AI } from './ai/config';
import { createSession } from './session';
const map = [
  { id: 'home', owner: 'player' as const, units: 21, x: 0, y: 0 },
  { id: 'away', owner: 'enemy' as const, units: 21, x: 300, y: 0 },
];

describe('nonvisual session controls', () => {
  it('holds the opening board until explicitly started', () => {
    const session = createSession(map, null);
    const initial = session.state;
    session.frame(1000);
    session.frame(5000);
    session.dispatch('home', 'away');
    expect(session.phase).toBe('ready');
    expect(session.state).toBe(initial);
    session.start();
    session.frame(6000);
    session.frame(7000);
    expect(session.state.elapsedMs).toBe(1000);
    expect(session.state.territories[0].units).toBe(22);
  });
  it('freezes troops, growth and orders during pause and resumes without catch-up', () => {
    const session = createSession(map, null);
    session.start();
    session.frame(0);
    session.dispatch('home', 'away');
    session.frame(250);
    session.pause();
    const paused = session.state;
    session.frame(60000);
    session.dispatch('home', 'away');
    session.start();
    expect(session.phase).toBe('paused');
    expect(session.state).toBe(paused);
    session.resume();
    session.frame(61000);
    session.frame(61100);
    expect(session.state.elapsedMs).toBe(350);
    expect(session.state.transfers[0].elapsedMs).toBe(350);
  });
  it('background suspension is independent of manual pause', () => {
    const session = createSession(map, null);
    session.start();
    session.frame(0);
    session.frame(125);
    session.setHidden(true);
    session.frame(50000);
    session.pause();
    session.setHidden(false);
    session.frame(51000);
    expect(session.state.elapsedMs).toBe(100);
    session.resume();
    session.frame(52000);
    session.frame(52025);
    expect(session.state.elapsedMs).toBe(150); // preserved 25ms active carry
  });
  it('restarts to a fresh ready board with no old clock carry, orders or AI deadline', () => {
    const session = createSession(map);
    session.start();
    session.frame(0);
    session.frame(1825);
    session.dispatch('home', 'away');
    session.pause();
    session.restart();
    expect(session.phase).toBe('ready');
    expect(session.state).toMatchObject({
      elapsedMs: 0,
      transfers: [],
      arrivals: [],
      nextTransferId: 1,
      aiNextDecisionMs: null,
    });
    expect(session.state.territories.map((n) => n.units)).toEqual([21, 21]);
    session.start();
    session.frame(60000);
    session.frame(60025);
    expect(session.state.elapsedMs).toBe(0);
  });
  it('cannot resume or issue orders after a terminal outcome; restart clears it', () => {
    const session = createSession(
      map.map((n) => ({ ...n, units: n.id === 'away' ? 0 : 21 })),
      null,
      { unitsPerSecond: 0 },
    );
    session.start();
    session.frame(0);
    session.dispatch('home', 'away');
    session.frame(8000);
    expect(session.state.roundStatus).toBe('victory');
    const ended = session.state;
    session.pause();
    session.resume();
    session.start();
    session.frame(100000);
    session.dispatch('home', 'away');
    expect(session.state).toBe(ended);
    expect(session.active).toBe(false);
    session.restart();
    expect(session.phase).toBe('ready');
    expect(session.state.roundStatus).toBe('playing');
  });
  it('restarting in the background does not permit dispatch or hidden-time catch-up', () => {
    const session = createSession(map, null);
    session.setHidden(true);
    session.restart();
    session.start();
    session.frame(1000);
    session.dispatch('home', 'away');
    expect(session.state.elapsedMs).toBe(0);
    expect(session.state.transfers).toHaveLength(0);
    session.setHidden(false);
    session.frame(50000);
    session.frame(50100);
    expect(session.state.elapsedMs).toBe(100);
  });
  it('reserves asynchronous AI decisions once and applies the returned faction order', () => {
    const session = createSession(
      [...map, { id: 'neutral', owner: 'neutral', units: 1, x: 150, y: 150 }],
      null,
    );
    session.start();
    session.frame(0);
    session.frame(DEFAULT_AI.initialDelayMs);
    expect(session.reserveAiDecision('enemy', DEFAULT_AI)).toBe(true);
    expect(session.reserveAiDecision('enemy', DEFAULT_AI)).toBe(false);
    expect(session.state.aiDecisionDeadlines.enemy).toBe(
      DEFAULT_AI.initialDelayMs + DEFAULT_AI.decisionIntervalMs,
    );
    const next = session.dispatchFaction('away', 'neutral', 'enemy');
    expect(next.transfers.some((t) => t.owner === 'enemy')).toBe(true);
  });

  it('freezes AI decisions while paused', () => {
    const session = createSession([
      ...map,
      { id: 'neutral', owner: 'neutral', units: 1, x: 150, y: 150 },
    ]);
    session.start();
    session.frame(0);
    session.frame(1700);
    session.pause();
    session.frame(60000);
    expect(session.state.transfers).toHaveLength(0);
    session.resume();
    session.frame(61000);
    session.frame(61100);
    expect(session.state.transfers.some((t) => t.owner === 'enemy')).toBe(true);
  });
});
