import { describe, expect, it } from 'vitest';
import { MAPS } from './maps';
import { compileRoundSetup } from '../game/upgrades/compile';
import { createSimulation } from '../game/state';
import { dispatchUnits } from '../game/dispatch';
import { advanceRound } from '../game/round';
import { forecastBattle } from '../game/ai/forecast';
import { getTerritoryGrowthRate } from '../game/features/growthRate';
import { createSession } from '../game/session';

const map = () => MAPS.find(map => map.id === 'foundry')!;

describe('contested Factory river scenario', () => {
  it('appends a separate map with two open crossings and one neutral Factory', () => {
    expect(MAPS.map(map => map.id)).toEqual(['meadow', 'forks', 'ridge', 'dense', 'crossfire', 'bridges', 'foundry', 'siege']);
    const field = map();
    expect(field.territories).toHaveLength(8);
    expect(field.river?.bridges).toHaveLength(2);
    const factories = field.territories.filter(city => city.features?.some(feature => feature.kind === 'factory'));
    expect(factories).toHaveLength(1);
    expect(factories[0].owner).toBe('neutral');
    expect(MAPS.find(map => map.id === 'bridges')!.territories.every(city => !city.features)).toBe(true);
  });
  it('offers both factions equally long legal opening attacks on the Factory', () => {
    const field = map();
    const setup = compileRoundSetup(field.territories, {}, undefined, 0, {}, field.river);
    const state = createSimulation(setup.territories, setup.rules, setup.river);
    const enemy = dispatchUnits(state, 'north', 'west-north', 'enemy');
    const player = dispatchUnits(state, 'south', 'west-north');
    expect(enemy.transfers.length).toBeGreaterThan(0);
    expect(player.transfers.length).toBeGreaterThan(0);
    expect(enemy.transfers[0].durationMs).toBe(player.transfers[0].durationMs);
    expect(player.transfers[0].units).toBe(5);
    expect(state.territories.find(city => city.id === 'west-north')!.units).toBe(14);
    expect(dispatchUnits(state, 'south', 'east-north')).toBe(state);
  });
  it.each(['player', 'enemy'])('captures the authored Factory with real batches for %s; forecasts and replay agree', owner => {
    const field = map();
    const setup = compileRoundSetup(field.territories, { [owner]: ['industry'] }, undefined, 0, {}, field.river);
    const state = createSimulation(setup.territories, setup.rules, setup.river);
    const ordered = dispatchUnits(state, owner === 'player' ? 'south' : 'north', 'west-north', owner);
    const result = advanceRound(ordered, 8000);
    expect(forecastBattle(ordered, 8000).territories).toEqual(result.territories);
    const factory = result.territories.find(city => city.id === 'west-north')!;
    expect(factory.owner).toBe(owner);
    expect(getTerritoryGrowthRate(result, factory)).toBe(2.5);
    const session = createSession(setup.territories, null, setup.rules, { river: setup.river, initialState: result, initialPhase: 'paused' });
    session.restart();
    expect(session.state.territories.find(city => city.id === 'west-north')!.owner).toBe('neutral');
    expect(session.state.river).toEqual(field.river);
  });
});
