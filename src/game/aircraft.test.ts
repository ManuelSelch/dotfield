import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { advanceWorldStep } from './worldStep';
import { launchAircraft } from './aircraft';
import { convertCity } from './cityConversion';
import { resolveCombat } from './combat';
import { dispatchUnits } from './dispatch';
import type { SimulationState, Transfer } from './types';

function opening(units = 101, targetOwner = 'enemy') {
  return createSimulation([{ id: 'home', owner: 'player', cityType: 'airfield', units, x: 0, y: 0 },
    { id: 'target', owner: targetOwner, units: 10, x: 98, y: 0 }],
  { factions: { player: { unitsPerSecond: 0, travelSpeed: 35, batchIntervalMs: 600 },
    enemy: { unitsPerSecond: 0, travelSpeed: 35, batchIntervalMs: 600 } } });
}
function ready(units = 101, targetOwner = 'enemy') { return advanceWorldStep(opening(units, targetOwner), 20000); }
function arrival(state: SimulationState, targetId: string, owner: string, units: number, id = 1): Transfer {
  const target = state.territories.find(c => c.id === targetId)!;
  return { id, sourceId: owner === 'enemy' ? 'target' : 'home', targetId, owner, units, formationSize: units,
    dotSlots: [], from: target, to: target, durationMs: 1, elapsedMs: 1 };
}
describe('aircraft', () => {
  it('prepares exactly one plane, boards once, rejects busy orders and freezes terminal state', () => {
    expect(advanceWorldStep(opening(), 19999).aircraft?.home.phase).toBe('preparing');
    const state = ready();
    expect(state.aircraft?.home.phase).toBe('ready');
    const launched = launchAircraft(state, 'home', 'target');
    expect(launched.aircraft?.home).toMatchObject({ phase: 'outbound', cargo: 100 });
    expect(launched.territories[0].units).toBe(1);
    expect(launched.transfers).toEqual([]);
    expect(launchAircraft(launched, 'home', 'target')).toBe(launched);
    expect(convertCity(launched, 'home', 'production')).toBe(launched);
    const ended = { ...launched, roundStatus: 'victory' as const };
    expect(advanceWorldStep(ended, 99999)).toBe(ended);
  });
  it('docks at the edge then pulses first at docking + 200ms and returns empty', () => {
    const launched = launchAircraft(ready(9, 'player'), 'home', 'target');
    const duration = launched.aircraft!.home.durationMs;
    const docked = advanceWorldStep(launched, duration);
    expect(docked.aircraft?.home).toMatchObject({ phase: 'unloading', cargo: 8, position: { x: 84, y: 0 } });
    expect(advanceWorldStep(docked, 199).aircraft?.home.cargo).toBe(8);
    const first = advanceWorldStep(docked, 200);
    expect(first.aircraft?.home.cargo).toBe(3);
    expect(first.airDeliveries?.[0]).toMatchObject({ homeId: 'home', targetId: 'target', units: 5, result: 'reinforced' });
    const returning = advanceWorldStep(first, 200);
    expect(returning.aircraft?.home).toMatchObject({ phase: 'returning', cargo: 0 });
    expect(returning.territories[1].units).toBe(18);
    const turnaround = advanceWorldStep(returning, returning.aircraft!.home.durationMs);
    expect(turnaround.aircraft?.home.phase).toBe('turnaround');
    expect(advanceWorldStep(turnaround, 9999).aircraft?.home.phase).toBe('turnaround');
    expect(advanceWorldStep(turnaround, 10000).aircraft?.home.phase).toBe('ready');
    expect(Object.keys(advanceWorldStep(turnaround, 100000).aircraft!)).toEqual(['home']);
  });
  it('delivers 100 as 20 shared combat batches against three shields', () => {
    const state = ready();
    const launched = launchAircraft({ ...state, captureShields: { target: { remaining: 3 } } }, 'home', 'target');
    const finished = advanceWorldStep(launched, launched.aircraft!.home.durationMs + 4000);
    expect(finished.territories[1]).toMatchObject({ owner: 'player', units: 75 });
    expect(finished.aircraft?.home).toMatchObject({ phase: 'returning', cargo: 0 });
  });
  it('destroys old cargo on every capture even when recaptured in the same combat step', () => {
    const flying = launchAircraft(ready(), 'home', 'target');
    const captured = resolveCombat({ ...flying, arrivals: [arrival(flying, 'home', 'enemy', 2), arrival(flying, 'home', 'player', 2, 2)] });
    expect(captured.territories[0]).toMatchObject({ owner: 'player', cityType: 'airfield' });
    expect(captured.aircraft?.home).toMatchObject({ owner: 'player', phase: 'preparing', cargo: 0, elapsedMs: 0 });
  });
  it('resolves equal-time home captures before any air delivery, independent of partition', () => {
    const launched = launchAircraft(ready(), 'home', 'target');
    const docking = launched.aircraft!.home.durationMs;
    const docked = advanceWorldStep(launched, docking);
    const ground = { ...arrival(docked, 'home', 'enemy', 5), elapsedMs: 0, durationMs: 200 };
    const threatened = { ...docked, transfers: [ground] };
    const coarse = advanceWorldStep(threatened, 200);
    const fine = advanceWorldStep(advanceWorldStep(threatened, 73), 127);
    expect(fine).toEqual(coarse);
    expect(coarse.territories[1].units).toBe(10);
    expect(coarse.airDeliveries).toEqual([]);
    expect(coarse.aircraft?.home).toMatchObject({ owner: 'enemy', phase: 'preparing', cargo: 0, elapsedMs: 0 });
  });
  it('does not deliver early when a home capture follows the pulse by one millisecond', () => {
    const flying = launchAircraft(ready(), 'home', 'target');
    const docked = advanceWorldStep(flying, flying.aircraft!.home.durationMs);
    const state = { ...docked, transfers: [{ ...arrival(docked, 'home', 'enemy', 5), elapsedMs: 0, durationMs: 201 }] };
    const result = advanceWorldStep(state, 201);
    expect(result.territories[1].units).toBe(5);
    expect(result.airDeliveries).toHaveLength(1);
    expect(result.aircraft?.home.cargo).toBe(0);
  });
  it('boards actual garrison after canceling reservations, but leaves launched ground troops alone', () => {
    const state = dispatchUnits(ready(151), 'home', 'target');
    const launched = launchAircraft(state, 'home', 'target');
    expect(launched.aircraft?.home.cargo).toBe(100);
    expect(launched.territories[0].units).toBe(46);
    expect(launched.transfers).toHaveLength(1);
    expect(dispatchUnits(launched, 'home', 'target').transfers.length).toBeGreaterThan(1);
    expect(launchAircraft(state, 'home', 'home')).toBe(state);
    expect(launchAircraft(state, 'home', 'missing')).toBe(state);
    expect(launchAircraft(state, 'home', 'target', 'enemy')).toBe(state);
  });
  it('resolves later pulses against current target ownership, including intervening recapture', () => {
    const flying = launchAircraft(ready(21), 'home', 'target');
    let state = advanceWorldStep(flying, flying.aircraft!.home.durationMs + 600);
    expect(state.territories[1]).toMatchObject({ owner: 'player', units: 5 });
    state = resolveCombat({ ...state, arrivals: [arrival(state, 'target', 'enemy', 6)] });
    state = advanceWorldStep(state, 200);
    expect(state.territories[1]).toMatchObject({ owner: 'player', units: 4 });
    expect(state.aircraft?.home.cargo).toBe(0);
  });
  it('keeps fractional-duration pulse timestamps and shield cooldowns partition-invariant', () => {
    const base = ready();
    const state = launchAircraft({ ...base, territories: base.territories.map(c => c.id === 'target' ? { ...c, x: 97 } : c),
      captureShields: { target: { remaining: 3 } } }, 'home', 'target');
    const whole = advanceWorldStep(state, 8437);
    let split = state;
    for (const dt of [17, 113, 567, 1021, 231, 6488]) split = advanceWorldStep(split, dt);
    expect(split).toEqual(whole);
  });
  it('is equivalent across arbitrary time partitions including docking and pulses', () => {
    const state = launchAircraft(ready(), 'home', 'target');
    const whole = advanceWorldStep(state, 8437);
    let split = state;
    for (const dt of [17, 113, 567, 1021, 231, 6488]) split = advanceWorldStep(split, dt);
    expect(split).toEqual(whole);
  });
});
