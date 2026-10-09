import { GROWTH_RULES } from './settings';
import type { RulesInput, SimulationState, Territory } from './types';
import { createRules, getFactionRules } from './rules';

export function createSimulation(
  territories: readonly Territory[],
  rules: RulesInput = GROWTH_RULES,
): SimulationState {
  const resolved = createRules(rules);
  for (const city of territories) {
    if (city.owner !== 'neutral') getFactionRules({ rules: resolved }, city.owner);
  }

  return {
    roundStatus: 'playing',
    aiNextDecisionMs: null,
    elapsedMs: 0,
    transfers: [],
    arrivals: [],
    nextTransferId: 1,
    rules: resolved,
    territories: territories.map((node) => ({ ...node, growthRemainder: 0 })),
  };
}
