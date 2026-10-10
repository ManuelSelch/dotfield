import { BATCH_INTERVAL_MS, GROWTH_RULES, TRAVEL_SPEED } from './settings';
import type { FactionId, FactionRules, RulesInput, SimulationRules, SimulationState } from './types';

export const BASE_FACTION_RULES: FactionRules = Object.freeze({
  unitsPerSecond: GROWTH_RULES.unitsPerSecond,
  travelSpeed: TRAVEL_SPEED,
  batchIntervalMs: BATCH_INTERVAL_MS,
  captureShieldBatches: 0,
});

// Normalize the legacy shared-growth API; snapshot every faction independently.
export function createRules(input: RulesInput = GROWTH_RULES): SimulationRules {
  const factions = 'factions' in input ? input.factions : {
    player: { ...BASE_FACTION_RULES, ...input }, enemy: { ...BASE_FACTION_RULES, ...input },
  };
  const entries = Object.entries(factions).map(([id, rules]) => {
    const captureShieldBatches = rules.captureShieldBatches ?? 0;
    if (!id || !Number.isFinite(rules.unitsPerSecond) || rules.unitsPerSecond < 0
      || !Number.isFinite(rules.travelSpeed) || rules.travelSpeed <= 0
      || !Number.isFinite(rules.batchIntervalMs) || rules.batchIntervalMs <= 0
      || !Number.isInteger(captureShieldBatches) || captureShieldBatches < 0 || captureShieldBatches > 3) {
      throw new RangeError(`Invalid rules for faction ${id}.`);
    }
    return [id, Object.freeze({ ...rules, captureShieldBatches })] as const;
  });
  return Object.freeze({ factions: Object.freeze(Object.fromEntries(entries)) });
}

export function getFactionRules(state: Pick<SimulationState, 'rules'>, id: FactionId): FactionRules {
  if (!Object.hasOwn(state.rules.factions, id)) throw new RangeError(`Missing rules for faction ${id}.`);
  return state.rules.factions[id];
}
