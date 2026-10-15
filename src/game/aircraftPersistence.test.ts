import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { advanceWorldStep } from './worldStep';
import { launchAircraft } from './aircraft';
import { createSession } from './session';
import { convertCity } from './cityConversion';
import { resolveArrivalBatch } from './combat';
import { readSavedGame, writeSavedGame } from './persistence';
import { snapshotTerritories } from './features/snapshot';
import { getTroopComposition } from './troopComposition';
import { evaluateRound } from './round';
import type { SimulationState } from './types';

const opening = [
  { id: 'home', owner: 'player', cityType: 'airfield' as const, units: 101, x: 0, y: 0,
    features: [{ id: 'factory', kind: 'factory' as const, productionMultiplier: 2 }] },
  { id: 'target', owner: 'enemy', units: 100, x: 98, y: 0 },
];
function phases() {
  const preparing = advanceWorldStep(createSimulation(opening, { unitsPerSecond: 0 }), 1234);
  const ready = advanceWorldStep(preparing, 20000);
  const launched = launchAircraft(ready, 'home', 'target');
  const outbound = advanceWorldStep(launched, 111);
  const unloading = advanceWorldStep(launched, launched.aircraft!.home.durationMs + 250);
  const returning = advanceWorldStep(launched, launched.aircraft!.home.durationMs + 4000 + 111);
  const turnaround = advanceWorldStep(returning, returning.aircraft!.home.durationMs);
  return { preparing, ready, outbound, unloading, returning, turnaround };
}
function restore(state: SimulationState, mutate?: (raw: any) => void) {
  let raw = '';
  writeSavedGame({ state, territories: opening, ai: null, phase: 'paused' }, { setItem: (_key, value) => { raw = value; } });
  const parsed = JSON.parse(raw);
  mutate?.(parsed);
  return readSavedGame({ getItem: () => JSON.stringify(parsed) });
}

describe('air transport save validation', () => {
  it.each(Object.entries(phases()))('restores %s exactly and continues identically', (phase, state) => {
    expect(state.aircraft?.home.phase).toBe(phase);
    const saved = restore(state)!;
    expect(saved.state).toEqual(state);
    expect(advanceWorldStep(saved.state, 1733)).toEqual(advanceWorldStep(state, 1733));
    const session = createSession(saved.territories, null, saved.state.rules,
      { initialState: saved.state, initialPhase: saved.phase });
    session.frame(0); session.frame(999999);
    expect(session.state).toBe(saved.state);
    session.resume(); session.setHidden(true); session.frame(1999999);
    expect(session.state).toBe(saved.state);
    session.restart();
    expect(session.state.territories).toEqual(createSimulation(saved.territories, saved.state.rules).territories);
    expect(session.state.aircraft?.home).toMatchObject({ phase: 'preparing', tripId: 0, cargo: 0, elapsedMs: 0 });
  });
  it('assigns normalized immutable opening and live snapshots without mutating inputs', () => {
    const saved = restore(phases().preparing)!;
    expect(saved.territories[1].cityType).toBe('production');
    expect(Object.isFrozen(saved.territories)).toBe(true);
    expect(Object.isFrozen(saved.state.territories[0].features?.[0])).toBe(true);
    expect(snapshotTerritories(opening)[1].cityType).toBe('production');
    expect(opening[1]).not.toHaveProperty('cityType');
    const replay = createSimulation(saved.territories, saved.state.rules);
    expect(replay.aircraft?.home).toMatchObject({ phase: 'preparing', cargo: 0, elapsedMs: 0 });
    expect(replay.territories[0].features).toEqual(opening[0].features);
  });
  it('restores legacy cities as Production without planes or shields', () => {
    const saved = restore(phases().preparing, raw => {
      for (const city of [...raw.territories, ...raw.state.territories]) delete city.cityType;
      delete raw.state.aircraft; delete raw.state.nextAircraftTripId; delete raw.state.airDeliveries;
    })!;
    expect(saved.state.territories.every(c => c.cityType === 'production')).toBe(true);
    expect(saved.state.aircraft).toEqual({});
    expect(saved.state.captureShields).toEqual({});
  });
  it.each([
    (s: any) => { delete s.aircraft; },
    (s: any) => { s.aircraft = {}; },
    (s: any) => { s.aircraft.other = s.aircraft.home; },
    (s: any) => { s.aircraft.home.owner = 'enemy'; },
    (s: any) => { s.aircraft.home.homeId = 'target'; },
    (s: any) => { s.aircraft.home.targetId = 'missing'; },
    (s: any) => { s.aircraft.home.targetId = 'home'; },
    (s: any) => { s.aircraft.home.phase = 'invalid'; },
    (s: any) => { s.aircraft.home.cargo = 101; },
    (s: any) => { s.aircraft.home.cargo = 1.5; },
    (s: any) => { s.aircraft.home.tripId = 0; },
    (s: any) => { s.nextAircraftTripId = 1; },
    (s: any) => { delete s.nextAircraftTripId; },
    (s: any) => { s.aircraft.home.elapsedMs = -1; },
    (s: any) => { s.aircraft.home.durationMs = 1; },
    (s: any) => { s.aircraft.home.position.x += 5; },
    (s: any) => { s.aircraft.home.to.x += 5; },
    (s: any) => { s.territories[0].cityType = 'production'; },
    (s: any) => { s.elapsedMs = -1; },
    (s: any) => { s.territories[0].cityType = 'other'; },
    (s: any) => { s.territories[0].units = -1; },
    (s: any) => { s.aircraft = null; },
    (s: any) => { s.aircraft = []; },
    (s: any) => { s.airDeliveries = null; },
    (s: any) => { s.networkShieldTimers = null; },
    (s: any) => { s.captureShields = null; },
    (s: any) => { s.aircraft.home.elapsedMs = s.elapsedMs + 1; s.aircraft.home.durationMs = s.elapsedMs + 2; },
  ])('rejects corrupt aircraft runtime %# rather than minting planes/cargo', corrupt => {
    expect(restore(phases().outbound, raw => corrupt(raw.state))).toBeNull();
  });
  it.each(['preparing', 'ready', 'returning', 'turnaround'] as const)('rejects cargo in empty phase %s', phase => {
    expect(restore(phases()[phase], raw => { raw.state.aircraft.home.cargo = 5; })).toBeNull();
  });
  it('restores captured airfield preparation, never the previous cargo', () => {
    const captured = resolveArrivalBatch(phases().outbound, { targetId: 'home', owner: 'enemy', units: 2 }).state;
    expect(restore(captured)?.state.aircraft?.home).toMatchObject({ owner: 'enemy', phase: 'preparing', cargo: 0 });
    expect(restore(captured, raw => { raw.state.aircraft.home = phases().outbound.aircraft!.home; })).toBeNull();
  });
  it.each([
    { capacity: 4 }, { capacity: 2 }, { source: 'network' }, { source: 'other' },
    { resetAtMs: -1 }, { resetAtMs: 1000000 }, { resetAtMs: 1234, elapsedMs: 10 },
  ])('rejects invalid new recharge metadata %j', change => {
    const state = advanceWorldStep(createSimulation([{ ...opening[0], cityType: 'defender' }, opening[1]]), 1234);
    expect(restore(state, raw => { Object.assign(raw.state.networkShieldTimers.home, change); })).toBeNull();
  });
  it('restores earned Defender charges, including charges retained after switching away', () => {
    const state = advanceWorldStep(createSimulation([{ ...opening[0], cityType: 'defender' }, opening[1]]), 10000);
    expect(state.captureShields.home.remaining).toBe(1);
    expect(restore(state)?.state.captureShields).toEqual(state.captureShields);
    const switched = convertCity(state, 'home', 'production');
    expect(restore(switched)?.state.captureShields).toEqual(state.captureShields);
  });
  it('rejects null trip counters even when no airfields exist', () => {
    const state = createSimulation(opening.map(c => ({ ...c, cityType: 'production' })));
    expect(restore(state, raw => { raw.state.nextAircraftTripId = null; })).toBeNull();
  });
  it('rejects duplicate trip IDs and non-airfield slots', () => {
    const state = phases().outbound;
    expect(restore(state, raw => {
      raw.state.territories[1].cityType = 'airfield';
      raw.state.territories[1].owner = 'player';
      raw.state.aircraft.target = { ...raw.state.aircraft.home, homeId: 'target', targetId: 'home' };
    })).toBeNull();
    expect(restore(createSimulation(opening.map(c => ({ ...c, cityType: 'production' }))), raw => {
      raw.state.aircraft.home = state.aircraft!.home;
    })).toBeNull();
  });
  it('survives actual home loss only through other launched troops, not destroyed cargo', () => {
    const flying = phases().outbound;
    const lost = resolveArrivalBatch(flying, { targetId: 'home', owner: 'enemy', units: 2 }).state;
    expect(evaluateRound(lost).roundStatus).toBe('defeat');
    expect(getTroopComposition(lost).find(s => s.owner === 'player')?.units).toBe(0);
    const transfer = { id: 1, sourceId: 'home', targetId: 'target', owner: 'player', units: 2,
      formationSize: 2, dotSlots: [0, 1], from: { x: 0, y: 0 }, to: { x: 98, y: 0 }, elapsedMs: 1, durationMs: 1000 };
    expect(evaluateRound({ ...lost, transfers: [transfer] }).roundStatus).toBe('playing');
  });
  it('preserves Defender timer metadata and rejects corrupt feedback', () => {
    const state = advanceWorldStep(createSimulation([{ ...opening[0], cityType: 'defender' }, opening[1]]), 1234);
    expect(restore(state)?.state.networkShieldTimers).toEqual(state.networkShieldTimers);
    expect(restore(phases().unloading, raw => { raw.state.airDeliveries[0].units = 6; })).toBeNull();
  });
});

describe('embarked troop accounting', () => {
  it.each(['outbound', 'unloading'] as const)('counts %s cargo once and excludes event feedback', phase => {
    const state = phases()[phase];
    const totals = getTroopComposition(state);
    expect(totals.find(s => s.owner === 'player')?.units).toBe(1 + state.aircraft!.home.cargo);
  });
  it('keeps a loaded faction alive but does not count empty planes', () => {
    const state = phases().outbound;
    const noCity = { ...state, territories: state.territories.filter(c => c.owner !== 'player') };
    expect(evaluateRound(noCity).roundStatus).toBe('playing');
    expect(evaluateRound({ ...noCity, aircraft: { home: { ...state.aircraft!.home, cargo: 0 } } }).roundStatus).toBe('defeat');
  });
});
