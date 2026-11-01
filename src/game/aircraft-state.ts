import { AIRCRAFT_PREPARATION_MS } from './settings';
import type { Aircraft, SimulationState, Territory } from './types';

export function createAircraft(home: Territory): Aircraft {
  const position = { x: home.x, y: home.y };
  return {
    homeId: home.id,
    owner: home.owner,
    tripId: 0,
    phase: 'preparing',
    cargo: 0,
    position,
    from: position,
    to: position,
    elapsedMs: 0,
    durationMs: AIRCRAFT_PREPARATION_MS,
  };
}

/** Normalize optional legacy runtime; never duplicate an existing owned slot. */
export function normalizeAircraft(state: SimulationState): SimulationState {
  const aircraft: Record<string, Aircraft> = {};
  let changed = false;
  for (const city of state.territories) {
    if (city.cityType !== 'airfield' || city.owner === 'neutral') continue;
    const old = state.aircraft?.[city.id];
    aircraft[city.id] = old?.owner === city.owner ? old : createAircraft(city);
    if (aircraft[city.id] !== old) changed = true;
  }
  if (Object.keys(state.aircraft ?? {}).length !== Object.keys(aircraft).length) changed = true;
  return changed ? { ...state, aircraft } : state;
}
