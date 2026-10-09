import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { dispatchUnits } from './dispatch';
import { advanceTravel } from './travel';
import { advanceRound } from './round';
import { forecastBattle } from './ai/forecast';
import { createClock } from './clock';

function battle(playerUnits = 6, enemyUnits = 2) {
  let state = createSimulation([
    { id: 'p', owner: 'player', units: playerUnits, x: 0, y: 100 },
    { id: 'e', owner: 'enemy', units: enemyUnits, x: 300, y: 100 },
  ], { unitsPerSecond: 0 });
  state = dispatchUnits(state, 'p', 'e');
  return dispatchUnits(state, 'e', 'p', 'enemy');
}

describe('collisions integrated with travel and rounds', () => {
  it('destroys only the center dot on contact, before either group arrives', () => {
    const initial = battle();
    const next = advanceTravel(initial, 4000);
    expect(next.arrivals).toEqual([]);
    expect(next.transfers).toHaveLength(1);
    expect(next.transfers[0]).toMatchObject({ units: 4, formationSize: 5, dotSlots: [0, 1, 3, 4] });
    expect(next.territories.map(n => n.units)).toEqual([1, 1]);
    expect(initial.transfers[0].units).toBe(5);
  });
  it('only survivors reach the border and apply combat; dead dots never reappear', () => {
    let state = advanceRound(battle(), 4000);
    state = advanceRound(state, 4000);
    expect(state.roundStatus).toBe('victory');
    expect(state.territories[1]).toMatchObject({ owner: 'player', units: 3 });
    expect(state.transfers).toEqual([]);
    expect(state.arrivals).toEqual([]);
  });
  it('keeps queued groups inside sources until launch and preserves one-for-one losses across waves', () => {
    const state = advanceTravel(battle(21, 21), 10000);
    expect(state.transfers).toEqual([]);
    expect(state.arrivals).toEqual([]);
    expect(state.territories.map(n => n.units)).toEqual([1, 1]);
  });
  it('matches bulk travel and repeated 50-ms updates', () => {
    const initial = battle(21, 11);
    let stepped = initial;
    for (let i = 0; i < 160; i++) stepped = advanceTravel(stepped, 50);
    expect(advanceTravel(initial, 8000)).toEqual(stepped);
  });
  it.each([30, 60, 120])('produces the same collision outcome at %i rendering FPS', fps => {
    const initial = battle();
    const clock = createClock();
    let state = initial;
    for (let frame = 0; frame <= fps * 8; frame++) {
      state = advanceRound(state, clock.advance(frame * 1000 / fps));
    }
    expect(state).toEqual(advanceRound(initial, 8000));
  });
  it('AI forecasting predicts the same per-dot losses as the live simulation', () => {
    const initial = battle();
    const forecast = forecastBattle(initial, 4000);
    const actual = advanceRound(initial, 4000);
    expect(forecast.territories).toEqual(actual.territories);
    expect(forecast.transfers).toEqual(actual.transfers);
    expect(forecast.transfers[0].units).toBe(4);
  });
  it('eliminates factions whose last airborne dots destroy each other', () => {
    const initial = { ...battle(6, 6), territories: [] };
    const result = advanceRound(initial, 5000);
    expect(result.roundStatus).toBe('draw');
    expect(result.transfers).toEqual([]);
  });
});
