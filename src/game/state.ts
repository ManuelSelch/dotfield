import type { RulesInput, SimulationState, Territory } from './types';
import { BASE_FACTION_RULES, createRules, getFactionRules } from './rules';
import { snapshotTerritories } from './features/snapshot';
import { createRiver, type River } from './river';

export function createSimulation(
  territories: readonly Territory[],
  rules?: RulesInput,
  river?: River,
): SimulationState {
  const factionIds = [...new Set(['player', ...territories.map(city => city.owner)
    .filter((owner): owner is string => owner !== 'neutral')])];
  const configured = rules && 'factions' in rules ? rules : { factions: Object.fromEntries(factionIds.map(id =>
    [id, { ...BASE_FACTION_RULES, ...(rules ?? {}) }])) };
  const resolved = createRules(configured);
  const opening = snapshotTerritories(territories);
  for (const city of opening) {
    if (city.owner !== 'neutral') getFactionRules({ rules: resolved }, city.owner);
    for (const feature of city.features ?? []) {
      if (feature.kind === 'factory' && feature.beneficiaryId !== undefined) getFactionRules({ rules: resolved }, feature.beneficiaryId);
    }
  }

  return {
    ...(river ? { river: createRiver(river, opening) } : {}),
    roundStatus: 'playing',
    aiNextDecisionMs: null,
    aiDecisionDeadlines: {},
    elapsedMs: 0,
    transfers: [],
    arrivals: [],
    nextTransferId: 1,
    watchtowerElapsedMs: Object.fromEntries(opening.flatMap(city => (city.features ?? [])
      .filter(feature => feature.kind === 'watchtower').map(feature => [feature.id, 0]))),
    rules: resolved,
    territories: opening.map((node) => ({ ...node, growthRemainder: 0 })),
  };
}
