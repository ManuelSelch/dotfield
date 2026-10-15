import type { Aircraft, Territory } from './types';
import { AIRCRAFT_PREPARATION_MS } from './settings';

export function createAircraft(home: Territory): Aircraft {
  const position = { x: home.x, y: home.y };
  return { homeId: home.id, owner: home.owner, tripId: 0, phase: 'preparing', cargo: 0,
    position, from: position, to: position, elapsedMs: 0, durationMs: AIRCRAFT_PREPARATION_MS };
}
