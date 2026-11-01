import type { River } from './river';
import { adjacentTerritoryIds } from './territory-adjacency';
import type { FactionId, Territory } from './types';

/** Cities connected to a faction's original city through shared borders between currently owned neighbors. */
export function connectedTerritoryIds(
  territories: readonly Territory[],
  factionId: FactionId,
  homeCityId: string | undefined,
  river?: River,
): ReadonlySet<string> {
  if (!homeCityId) return new Set();
  const home = territories.find((city) => city.id === homeCityId && city.owner === factionId);
  if (!home) return new Set();

  const neighbors = adjacentTerritoryIds(territories, river);
  const byId = new Map(territories.map((city) => [city.id, city]));
  const connected = new Set([home.id]);
  const queue = [home.id];
  while (queue.length) {
    const currentId = queue.shift()!;
    for (const neighborId of neighbors.get(currentId) ?? []) {
      const neighbor = byId.get(neighborId);
      if (!neighbor || neighbor.owner !== factionId || connected.has(neighborId)) continue;
      connected.add(neighborId);
      queue.push(neighborId);
    }
  }
  return connected;
}
