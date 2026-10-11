import { connectedTerritoryIds } from './connectedTerritories';
import { getFactionRules } from './rules';
import type { SimulationState, Territory } from './types';

export const CONNECTED_DEFENSE_BONUSES = [0, 0.1, 0.2, 0.3] as const;

export function connectedDefenseTierForSize(size: number): 0 | 1 | 2 | 3 {
  if (size >= 7) return 3;
  if (size >= 4) return 2;
  if (size >= 2) return 1;
  return 0;
}

export function getConnectedDefenseTier(state: SimulationState, territory: Territory): 0 | 1 | 2 | 3 {
  if (territory.owner === 'neutral' || !getFactionRules(state, territory.owner).connectedDefense) return 0;
  const connected = connectedTerritoryIds(state.territories, territory.owner, state.homeCityIds?.[territory.owner], state.river);
  if (!connected.has(territory.id)) return 0;
  return connectedDefenseTierForSize(connected.size);
}

export function connectedDefenseBonus(tier: number): number {
  return CONNECTED_DEFENSE_BONUSES[tier as 0 | 1 | 2 | 3] ?? 0;
}
