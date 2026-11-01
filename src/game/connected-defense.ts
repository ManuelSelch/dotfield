import { connectedTerritoryIds } from './connected-territories';
import { getFactionRules } from './rules';
import type { SimulationState, Territory } from './types';

export function connectedDefenseTierForSize(size: number): 0 | 1 | 2 | 3 {
  if (size >= 13) return 3;
  if (size >= 7) return 2;
  if (size >= 4) return 1;
  return 0;
}

export function connectedDefenseCapacities(state: SimulationState): ReadonlyMap<string, 1 | 2 | 3> {
  const capacities = new Map<string, 1 | 2 | 3>();
  for (const [factionId, rules] of Object.entries(state.rules.factions)) {
    if (!rules.connectedDefense) continue;
    const connected = connectedTerritoryIds(
      state.territories,
      factionId,
      state.homeCityIds?.[factionId],
      state.river,
    );
    const tier = connectedDefenseTierForSize(connected.size);
    if (tier > 0) for (const cityId of connected) capacities.set(cityId, tier as 1 | 2 | 3);
  }
  return capacities;
}

export function getConnectedDefenseTier(
  state: SimulationState,
  territory: Territory,
): 0 | 1 | 2 | 3 {
  if (territory.owner === 'neutral' || !getFactionRules(state, territory.owner).connectedDefense)
    return 0;
  const connected = connectedTerritoryIds(
    state.territories,
    territory.owner,
    state.homeCityIds?.[territory.owner],
    state.river,
  );
  if (!connected.has(territory.id)) return 0;
  return connectedDefenseTierForSize(connected.size);
}
