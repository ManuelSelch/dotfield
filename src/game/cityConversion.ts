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
  if (plane && ['outbound', 'unloading', 'returning'].includes(plane.phase)) return state;
  const { [cityId]: _plane, ...aircraft } = state.aircraft ?? {};
  const { [cityId]: _timer, ...networkShieldTimers } = state.networkShieldTimers ?? {};
  const weaponTimers = { ...state.weaponTimers };
  const artilleryShots = (state.artilleryShots ?? []).filter(shot => shot.sourceId !== cityId);
  const features = city.features?.some(feature => feature.kind === 'watchtower' || feature.kind === 'artillery')
    ? city.features.filter(feature => feature.kind !== 'watchtower' && feature.kind !== 'artillery') : city.features;
  if (type === 'watchtower' || type === 'artillery') weaponTimers[cityId] = { owner: city.owner, elapsedMs: 0 };
  else delete weaponTimers[cityId];
  const nextAircraft = type === 'airfield' ? { ...aircraft, [cityId]: createAircraft(city) } : aircraft;
  return {
    ...state, aircraft: nextAircraft, networkShieldTimers, weaponTimers, artilleryShots,
    territories: state.territories.map(c => c === city
      ? { ...c, cityType: type, units: c.units - CITY_CONVERSION_COST[type], growthRemainder: 0,
        ...(features ? { features } : {}) } : c),
    transfers: state.transfers.filter(t => t.sourceId !== cityId || t.elapsedMs >= 0),
  };
}
