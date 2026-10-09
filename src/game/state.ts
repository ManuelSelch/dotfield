import { GROWTH_RULES } from './settings';
import type { RulesInput, SimulationState, Territory } from './types';
import { createRules, getFactionRules } from './rules';
import { snapshotTerritories } from './features/snapshot';

export function createSimulation(
  territories: readonly Territory[],
  rules: RulesInput = GROWTH_RULES,
): SimulationState {
  const resolved = createRules(rules);
  const opening = snapshotTerritories(territories);
  for (const city of opening) {
    if (city.owner !== 'neutral') getFactionRules({ rules: resolved }, city.owner);
    for (const feature of city.features ?? []) getFactionRules({ rules: resolved }, feature.beneficiaryId);
  }

  return {
    roundStatus: 'playing',
    aiNextDecisionMs: null,
    elapsedMs: 0,
    transfers: [],
    arrivals: [],
    nextTransferId: 1,
    rules: resolved,
    territories: opening.map((node) => ({ ...node, growthRemainder: 0 })),
  };
}
