import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { dispatchUnits } from './dispatch';
import { convertCity } from './cityConversion';
import { resolveArrivalBatch } from './combat';
import { launchBatches, availableUnits } from './launch';
import { forecastBattle } from './ai/forecast';
import { applyAiAction } from './ai/actions';
import { advanceWorldStep } from './worldStep';
import { readSavedGame, writeSavedGame } from './persistence';
import type { SimulationState, Territory } from './types';
const opening: Territory[] = [
  { id: 'source', x: 40, y: 240, owner: 'player', units: 40 },
  { id: 'wall', x: 180, y: 240, owner: 'enemy', units: 40 },
  { id: 'rear', x: 320, y: 240, owner: 'enemy', units: 10 },
  { id: 'ally', x: 40, y: 400, owner: 'player', units: 10 },
];
const base = () => createSimulation(opening, { unitsPerSecond: 0 });
function build(state = base()) { return convertCity(state, 'wall', 'defender', 'enemy'); }
function roundTrip(state: SimulationState) {
  let raw = ''; writeSavedGame({ phase: 'paused', territories: opening, state, ai: null }, { setItem: (_, value) => { raw = value; } });
  return readSavedGame({ getItem: () => raw });
}
describe('Defender command and lifecycle integration', () => {
  it('rejects transit without replacing a valid queue; direct attack remains allowed', () => {
    const state = dispatchUnits(build(), 'source', 'wall');
    expect(dispatchUnits(state, 'source', 'rear')).toBe(state);
    expect(state.transfers.length).toBeGreaterThan(1);
  });
  it('cancels newly blocked queues immediately on conversion, leaving launched troops and source units unchanged', () => {
    const ordered = dispatchUnits(base(), 'source', 'rear');
    const closed = build(ordered);
    expect(closed.transfers).toEqual([ordered.transfers[0]]);
    expect(closed.territories[0].units).toBe(ordered.territories[0].units);
    expect(availableUnits(closed, 'source')).toBe(35);
    expect(convertCity(closed, 'wall', 'production', 'enemy').transfers).toEqual(closed.transfers);
  });
  it('revalidates stale launch queues and worker commands', () => {
    const ordered = dispatchUnits(base(), 'source', 'rear');
    const stale = { ...ordered, territories: build().territories.map(c => c.id === 'source' ? ordered.territories[0] : c) };
    expect(launchBatches(stale, 10_000).transfers).toEqual([ordered.transfers[0]]);
    expect(applyAiAction(build(), { type: 'ground', kind: 'attack', sourceId: 'source', targetId: 'rear', score: 10 }, 'player')).toEqual(build());
  });
  it('capture closes friendly transit immediately, even when captured again at the same instant', () => {
    const ownWall = { ...build(), territories: build().territories.map(c => c.id === 'wall' ? { ...c, owner: 'player' } : c) };
    const ordered = dispatchUnits(ownWall, 'source', 'rear');
    const captured = resolveArrivalBatch(ordered, { targetId: 'wall', owner: 'enemy', units: 25 }).state;
    expect(captured.transfers).toEqual([ordered.transfers[0]]);
    const recaptured = resolveArrivalBatch(captured, { targetId: 'wall', owner: 'player', units: 25 }).state;
    expect(recaptured.transfers).toEqual(captured.transfers);
  });
  it('restores old blocking queues by cancelling reservations, not rejecting airborne troops or losing units', () => {
    const ordered = dispatchUnits(base(), 'source', 'rear');
    const stale = { ...ordered, territories: build().territories.map(c => c.id === 'source' ? ordered.territories[0] : c) };
    const restored = roundTrip(stale)!;
    expect(restored).not.toBeNull();
    expect(restored.state.transfers).toEqual([ordered.transfers[0]]);
    expect(restored.state.territories[0].units).toBe(35);
    expect(restored.territories).toEqual(base().territories.map(({ growthRemainder: _, ...c }) => c));
  });
  it.each([599, 600, 601])('cancels at a known capture at %ims with launch-before-arrival ties and live/forecast parity', captureAt => {
    let state = createSimulation([
      ...opening.map(c => c.id === 'wall' ? { ...c, owner: 'player', cityType: 'defender' as const, units: 0 } : c),
      { id: 'raider', x: 180, y: 40, owner: 'enemy', units: 6 },
    ], { unitsPerSecond: 0 });
    state = dispatchUnits(state, 'raider', 'wall', 'enemy');
    state = { ...state, transfers: state.transfers.map(t => ({ ...t, elapsedMs: t.durationMs - captureAt })) };
    state = dispatchUnits(state, 'source', 'rear');
    const before = advanceWorldStep(state, captureAt - 1);
    expect(before.territories.find(c => c.id === 'wall')!.owner).toBe('player');
    expect(before.transfers.some(t => t.owner === 'player' && t.elapsedMs < 0)).toBe(true);
    const captured = advanceWorldStep(before, 1);
    expect(captured.territories.find(c => c.id === 'wall')!.owner).toBe('enemy');
    expect(captured.transfers.filter(t => t.owner === 'player')).toHaveLength(captureAt < 600 ? 1 : 2);
    expect(captured.transfers.some(t => t.owner === 'player' && t.elapsedMs < 0)).toBe(false);
    expect(forecastBattle(state, captureAt)).toEqual(captured);
  });
  it('live and forecast keep committed batches after a border is built', () => {
    const state = build(dispatchUnits(base(), 'source', 'rear'));
    let live = state; for (let i = 0; i < 160; i++) live = advanceWorldStep(live, 50);
    expect(forecastBattle(state, 8000)).toEqual(live);
    expect(live.territories.find(c => c.id === 'rear')!.units).toBe(5);
  });
});
