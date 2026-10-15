import { artilleryTarget } from '../features/artillery';
import { getTerritoryGrowthRate } from '../features/growthRate';
import { getFactionRules } from '../rules';
import type { SimulationState, TerritoryState } from '../types';
import { PRODUCTION_AI, type AiConfig } from './config';
import { airSupplyRoom, incomingThreat, usefulAirSupply } from './mobility';

export type OrderKind = 'expand' | 'attack' | 'reinforce';
export interface AiOrder { readonly sourceId: string; readonly targetId: string; readonly kind: OrderKind; readonly score: number }

export function scoreOrder(state: SimulationState, source: TerritoryState, target: TerritoryState,
  baseline: SimulationState, proposed: SimulationState, horizonMs: number, config: AiConfig, factionId: string,
  distances: ReadonlyMap<string, number>, productionGain = 0, sentUnits = source.units - 1): AiOrder | null {
  const before = baseline.territories.find(n => n.id === target.id)!;
  const after = proposed.territories.find(n => n.id === target.id)!;
  if (after.owner !== factionId) return null;
  let kind: OrderKind;
  let score: number;
  if (target.owner !== factionId) {
    if (before.owner === factionId) return null; // Existing troops already secure this region.
    kind = target.owner === 'neutral' ? 'expand' : 'attack';
    score = kind === 'expand' ? config.expansionScore : config.attackScore;
    // Value the extra production from a capturable Factory over a short horizon.
    // Forecast success and source safety still gate the order; no resource bonus.
    const extraProduction = getTerritoryGrowthRate(proposed, after) - getFactionRules(state, factionId).unitsPerSecond;
    score += Math.max(0, extraProduction) * 10;
    for (const feature of after.features ?? []) {
      if (feature.kind === 'artillery' && artilleryTarget(proposed, after, feature)) {
        score += 10000 / feature.fireIntervalMs;
      }
    }
  } else {
    kind = 'reinforce';
    const threatened = incomingThreat(state, target.id, factionId);
    if (threatened) {
      if (before.owner === factionId && before.units > config.defenceBuffer) return null;
      if (before.owner === factionId && after.units <= before.units) return null;
      score = config.defenceScore;
    } else {
      const advance = distances.get(source.id)! - distances.get(target.id)!;
      const airSupply = usefulAirSupply(state, source, target, factionId);
      if (target.cityType === 'airfield' && airSupplyRoom(state, target, factionId) < sentUnits) return null;
      if (!(advance >= config.frontlineAdvance) && productionGain < PRODUCTION_AI.minGain && !airSupply) return null;
      // A bounded, strictly increasing bonus favors Factory relief without
      // allowing large economic gains to overwhelm emergency defence scores.
      score = config.frontlineScore * (1 + productionGain / (productionGain + PRODUCTION_AI.bonusHalfGain));
    }
  }
  const sourceBefore = baseline.territories.find(n => n.id === source.id)!;
  const sourceAfter = proposed.territories.find(n => n.id === source.id)!;
  if (sourceBefore.owner === factionId && sourceAfter.owner !== factionId) {
    if (kind === 'reinforce') return null; // Economic/frontline transfers must not sacrifice their source.
    score -= config.sourceLossPenalty;
  }
  score -= horizonMs / 1000 * config.travelCostPerSecond;
  return score > 0 ? { sourceId: source.id, targetId: target.id, kind, score } : null;
}
