import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { advanceRound } from './round';
import { advanceWorldStep } from './worldStep';
import { forecastBattle } from './ai/forecast';
import { dispatchUnits } from './dispatch';
import { convertCity } from './cityConversion';
import type { SimulationState, Territory } from './types';

const cities: Territory[] = [{ id: 'relay', owner: 'player', units: 50, x: 100, y: 100 },
  { id: 'enemy', owner: 'enemy', units: 50, x: 300, y: 100 },
  { id: 'third', owner: 'enemy-2', units: 10, x: 300, y: 300 },
  { id: 'home', owner: 'player', units: 10, x: 100, y: 300 }];
const definition = { cityId: 'relay', activateAtMs: 120000, targetMs: 180000 };
const game = () => createSimulation(cities, { unitsPerSecond: 0 }, undefined, undefined, definition);
const own = (state: SimulationState, owner: string): SimulationState => ({ ...state,
  territories: state.territories.map(c => c.id === 'relay' ? { ...c, owner } : c) });

describe('relay clock and outcomes', () => {
  it('activates at 120 seconds, accumulates fractional milliseconds and wins at exactly five minutes', () => {
    let state = advanceRound(game(), 120000);
    expect(state.relay?.scoresMs.player).toBe(0);
    state = advanceWorldStep(state, 1.25);
    expect(state.relay?.scoresMs.player).toBe(1.25);
    state = advanceRound(state, 999999);
    expect(state.elapsedMs).toBe(300000);
    expect(state.roundStatus).toBe('victory');
    expect(state.outcome).toEqual({ reason: 'relay', winner: 'player' });
    expect(state.territories.some(c => c.owner === 'enemy')).toBe(true);
    expect(advanceRound(state, 1000)).toBe(state);
  });
  it('pauses progress on capture, scores every faction independently and never scores neutrals', () => {
    let state = advanceRound(game(), 121000);
    state = advanceRound(own(state, 'enemy'), 1250.5);
    state = advanceRound(own(state, 'neutral'), 2000);
    state = advanceRound(own(state, 'enemy-2'), 500);
    state = advanceRound(own(state, 'player'), 500);
    expect(state.relay?.scoresMs).toEqual({ player: 1500, enemy: 1250.5, 'enemy-2': 500 });
  });
  it('scores zero-garrison cities and keeps the objective across role conversions', () => {
    const converted = convertCity(game(), 'relay', 'artillery');
    const empty = { ...converted, territories: converted.territories.map(c => c.id === 'relay' ? { ...c, units: 0 } : c) };
    expect(advanceRound(empty, 121000).relay?.scoresMs.player).toBeCloseTo(1000, 6);
  });
  it('agrees across bulk, small-step and forecast advancement, including a fractional capture', () => {
    let state = own(game(), 'neutral');
    state = { ...state, elapsedMs: 120000 };
    state = dispatchUnits(state, 'enemy', 'relay', 'enemy');
    // Give this known attack a small neutral garrison to ensure a capture.
    state = { ...state, territories: state.territories.map(c => c.id === 'relay' ? { ...c, units: 1 } : c) };
    const bulk = advanceWorldStep(state, 15000);
    let stepped = state;
    for (let i = 0; i < 300; i++) stepped = advanceWorldStep(stepped, 50);
    expect(bulk.relay).toEqual(stepped.relay);
    expect(forecastBattle(state, 15000).relay).toEqual(bulk.relay);
    const captureAt = state.transfers[0].durationMs;
    expect(bulk.relay?.scoresMs.enemy).toBeCloseTo(15000 - captureAt, 6);
  });
  it('freezes forecasts at relay defeat rather than considering post-defeat actions', () => {
    const state = { ...own(game(), 'enemy'), elapsedMs: 299999,
      relay: { ...game().relay!, scoresMs: { player: 0, enemy: 179999, 'enemy-2': 0 } } };
    const forecast = forecastBattle(state, 10000);
    expect(forecast.elapsedMs).toBe(300000);
    expect(forecast.roundStatus).toBe('defeat');
    expect(forecast.outcome).toEqual({ reason: 'relay', winner: 'enemy' });
  });
  it('allows conquest before activation and gives it precedence at a simultaneous completion', () => {
    const state = own({ ...game(), territories: game().territories.map(c => ({ ...c, owner: 'player' })) }, 'player');
    expect(advanceRound(state, 1000).outcome).toEqual({ reason: 'conquest', winner: 'player' });
    const tied = { ...state, elapsedMs: 299999,
      relay: { ...state.relay!, scoresMs: { player: 179999, enemy: 0, 'enemy-2': 0 } } };
    expect(advanceWorldStep(tied, 1).outcome?.reason).toBe('conquest');
  });
  it.each([0.5, 1])('does not undo earned progress when captured at %sms into the last holding millisecond', arrivalMs => {
    let state = { ...game(), elapsedMs: 299999,
      relay: { ...game().relay!, scoresMs: { player: 179999, enemy: 0, 'enemy-2': 0 } },
      territories: game().territories.map(c => c.id === 'relay' ? { ...c, units: 0 } : c) };
    const attack = dispatchUnits(state, 'enemy', 'relay', 'enemy');
    state = { ...state, transfers: [{ ...attack.transfers[0], durationMs: arrivalMs }] };
    const after = advanceWorldStep(state, 2);
    expect(after.territories.find(c => c.id === 'relay')?.owner).toBe('enemy');
    expect(after.roundStatus).toBe(arrivalMs === 1 ? 'victory' : 'playing');
    expect(after.relay?.scoresMs.player).toBe(179999 + arrivalMs);
  });
  it('does not infer an objective in legacy states', () => {
    expect(advanceRound(createSimulation(cities), 301000).relay).toBeUndefined();
  });
});
