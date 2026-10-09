import { GROWTH_RULES } from './settings';
import type { GrowthRules, SimulationState, Territory } from './types';

export function createSimulation(
  territories: readonly Territory[],
  rules: GrowthRules = GROWTH_RULES,
): SimulationState {
  if (!Number.isFinite(rules.unitsPerSecond) || rules.unitsPerSecond < 0) {
    throw new RangeError('Growth rate must be finite and non-negative.');
  }

  return {
    elapsedMs: 0,
    rules: { ...rules },
    territories: territories.map((node) => ({ ...node, growthRemainder: 0 })),
  };
}
