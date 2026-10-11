import { canRiverOrder, type River } from './river';
import { canDirectTerrainOrder } from './terrain/directOrder';
import type { FactionId, Territory } from './types';
import type { Terrain } from './terrain/types';

/** Cities reachable from a faction's original city through currently owned legal legs. */
export function connectedTerritoryIds(
  territories: readonly Territory[], factionId: FactionId, homeCityId: string | undefined,
  river?: River, terrain?: Terrain,
): ReadonlySet<string> {
  if (!homeCityId) return new Set();
  const home = territories.find(city => city.id === homeCityId && city.owner === factionId);
  if (!home) return new Set();

  const connected = new Set([home.id]);
  const queue = [home];
  while (queue.length) {
    const current = queue.shift()!;
    for (const candidate of territories) {
      if (candidate.owner !== factionId || connected.has(candidate.id)) continue;
      if (canRiverOrder(current, candidate, river) && canDirectTerrainOrder(current, candidate, terrain)) {
        connected.add(candidate.id);
        queue.push(candidate);
      }
    }
  }
  return connected;
}
