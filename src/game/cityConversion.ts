import type { CityType, FactionId, SimulationState, Territory } from './types';
import { CITY_CONVERSION_COST } from './settings';
import { createAircraft } from './aircraft';

export function cityType(city: Territory): CityType { return city.cityType ?? 'production'; }

export function convertCity(state: SimulationState, cityId: string, type: CityType,
  faction: FactionId = 'player'): SimulationState {
  const city = state.territories.find(c => c.id === cityId);
  if (state.roundStatus !== 'playing' || !city || faction === 'neutral' || city.owner !== faction
    || !Object.hasOwn(CITY_CONVERSION_COST, type) || cityType(city) === type
    || city.units < CITY_CONVERSION_COST[type] + 1) return state;
  const plane = state.aircraft?.[cityId];
  if (plane && ['outbound', 'unloading', 'returning', 'turnaround'].includes(plane.phase)) return state;
  const { [cityId]: _plane, ...aircraft } = state.aircraft ?? {};
  const { [cityId]: _timer, ...networkShieldTimers } = state.networkShieldTimers ?? {};
  if (type === 'airfield') aircraft[cityId] = createAircraft(city);
  return {
    ...state, aircraft, networkShieldTimers,
    territories: state.territories.map(c => c === city
      ? { ...c, cityType: type, units: c.units - CITY_CONVERSION_COST[type], growthRemainder: 0 } : c),
    transfers: state.transfers.filter(t => t.sourceId !== cityId || t.elapsedMs >= 0),
  };
}
