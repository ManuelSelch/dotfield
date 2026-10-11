import { describe, expect, it } from 'vitest';
import { createSimulation } from '../state';
import { advanceTravel, transferPosition } from '../travel';
import { advanceWorldStep } from '../worldStep';
import { forecastBattle } from '../ai/forecast';
import { advanceRound } from '../round';
import { dotPosition } from '../dots';
import { createClock } from '../clock';
import { trajectory } from '../trajectory';
import type { Owner, SimulationState, Transfer } from '../types';

const zone = { id: 'zone', kind: 'slow-zone' as const, radius: 90, speedMultiplier: 0.5 };
function field(owner: Owner = 'neutral'): SimulationState {
  const state = createSimulation([
    { id: 'p', owner: 'player', units: 10, x: -21, y: 100 },
    { id: 'e', owner: 'enemy', units: 10, x: 421, y: 100 },
    { id: 'z', owner, units: 10, x: 200, y: 100, features: [zone] },
  ], { unitsPerSecond: 0 });
  const transfer: Transfer = { id: 1, sourceId: 'p', targetId: 'e', owner: 'player', units: 1,
    formationSize: 1, dotSlots: [0], from: { x: 0, y: 100 }, to: { x: 400, y: 100 },
    durationMs: 4000, elapsedMs: 0 };
  return { ...state, transfers: [transfer] };
}

describe('Slow Zone movement', () => {
  it('slows at entry, recovers at exit and detects crossings with endpoints outside', () => {
    const state = field();
    expect(transferPosition(advanceTravel(state, 2000).transfers[0]).x).toBeCloseTo(155);
    expect(transferPosition(advanceTravel(state, 5000).transfers[0]).x).toBeCloseTo(320);
    expect(advanceTravel(state, 5799).arrivals).toHaveLength(0);
    expect(advanceTravel(state, 5800).arrivals).toHaveLength(1);
  });
  it('preserves real flight age separately from distance progress', () => {
    const transfer = advanceTravel(field(), 2000).transfers[0];
    expect(transfer.elapsedMs).toBe(2000);
    expect(transferPosition(transfer).x).toBeCloseTo(155);
  });
  it('does not slow friendlies but neutral ownership slows either faction', () => {
    expect(transferPosition(advanceTravel(field('player'), 2000).transfers[0]).x).toBeCloseTo(200);
    for (const owner of ['player', 'enemy'] as const) {
      const state = field();
      expect(transferPosition(advanceTravel({ ...state, transfers: [{ ...state.transfers[0], owner }] }, 2000).transfers[0]).x).toBeCloseTo(155);
    }
  });
  it('changes eligibility on capture without jumping position', () => {
    const before = advanceTravel(field(), 2000);
    const captured = { ...before, territories: before.territories.map(c => c.id === 'z' ? { ...c, owner: 'player' as const } : c) };
    expect(transferPosition(captured.transfers[0])).toEqual(transferPosition(before.transfers[0]));
    expect(transferPosition(advanceTravel(captured, 1000).transfers[0]).x).toBeCloseTo(255);
    const enemy = { ...captured, territories: captured.territories.map(c => c.id === 'z' ? { ...c, owner: 'enemy' as const } : c) };
    expect(transferPosition(advanceTravel(enemy, 1000).transfers[0]).x).toBeCloseTo(205);
  });
  it('uses strongest-only overlap, not multiplicative stacking', () => {
    const state = field();
    const overlap = { ...state, territories: [...state.territories,
      { ...state.territories[2], id: 'z2', features: [{ ...zone, id: 'zone2', speedMultiplier: 0.25 }] }] };
    expect(transferPosition(advanceTravel(overlap, 2000).transfers[0]).x).toBeCloseTo(132.5);
  });
  it('does not slow queued launch time and ignores a tangent crossing', () => {
    const state = field();
    const queued = { ...state, transfers: [{ ...state.transfers[0], elapsedMs: -600 }] };
    expect(transferPosition(advanceTravel(queued, 2600).transfers[0]).x).toBeCloseTo(155);
    const tangent = { ...state, transfers: [{ ...state.transfers[0], from: { x: 0, y: 190 }, to: { x: 400, y: 190 } }] };
    expect(advanceTravel(tangent, 4000).arrivals).toHaveLength(1);
  });
  it('matches bulk and fixed travel and live/forecast physics', () => {
    const state = field();
    let stepped = state;
    for (let i = 0; i < 80; i++) stepped = advanceTravel(stepped, 50);
    expect(advanceTravel(state, 4000)).toEqual(stepped);
    const live = advanceWorldStep(state, 4000);
    const forecast = forecastBattle(state, 4000);
    expect(forecast.transfers).toEqual(live.transfers);
    expect(forecast.territories).toEqual(live.territories);
  });
  it('splits exact boundary trajectories even during a single large update', () => {
    const state = field();
    const motion = trajectory(state.transfers[0], 6000, state);
    expect(motion.segments.map(s => [s.start, s.end, s.from, s.to])).toEqual([
      [0, 1100, 0, 1100], [1100, 4700, 1100, 2900], [4700, 5800, 2900, 4000],
    ]);
    expect(motion.arrivalMs).toBe(5800);
  });
  it('sweeps slowed opposing dots and retains stable formation slots for survivors', () => {
    const state = field();
    const player = { ...state.transfers[0], units: 5, formationSize: 5, dotSlots: [0, 1, 2, 3, 4] };
    const enemy = { ...state.transfers[0], id: 2, owner: 'enemy' as const, sourceId: 'e', targetId: 'p',
      from: player.to, to: player.from };
    const battle = { ...state, transfers: [player, enemy] };
    expect(advanceTravel(battle, 2700).transfers).toHaveLength(2);
    const result = advanceTravel(battle, 3000);
    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0].dotSlots).toEqual([0, 1, 3, 4]);
    const progress = result.transfers[0].traveledMs!;
    expect(dotPosition(result.transfers[0], 0)).toEqual(dotPosition(player, 0, progress));
    expect(forecastBattle(battle, 3000).transfers).toEqual(advanceRound(battle, 3000).transfers);
  });
  it('uses slowed positions for Watchtower kills and shared forecasts', () => {
    const state = field('player');
    const armed = { ...state, territories: state.territories.map(c => c.id === 'z' ? { ...c,
      features: [...(c.features ?? []), { id: 'tower', kind: 'watchtower' as const, range: 150, fireIntervalMs: 250 }] } : c),
      transfers: [{ ...state.transfers[0], owner: 'enemy' as const, units: 5, formationSize: 5, dotSlots: [0, 1, 2, 3, 4] }] };
    const result = advanceWorldStep(armed, 2000);
    expect(result.transfers[0]?.units ?? 0).toBeLessThan(5);
    expect(forecastBattle(armed, 2000).transfers).toEqual(result.transfers);
  });
  it.each([30, 60, 120])('has identical movement at %s rendering FPS', fps => {
    const initial = field(); let state = initial; const clock = createClock();
    for (let frame = 0; frame <= fps * 4; frame++) state = advanceRound(state, clock.advance(frame * 1000 / fps));
    expect(state).toEqual(advanceRound(initial, 4000));
  });
  it.each([0, -1, Infinity, NaN, 1])('rejects invalid slowdown multiplier %s', speedMultiplier => {
    expect(() => createSimulation([{ ...field().territories[2], features: [{ ...zone, speedMultiplier }] }])).toThrow();
  });
});
