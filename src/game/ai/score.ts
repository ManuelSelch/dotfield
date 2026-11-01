import { artilleryTarget } from '@/game/features/artillery';
import { getTerritoryGrowthRate } from '@/game/features/growth-rate';
import { getFactionRules } from '@/game/rules';
import { ARTILLERY_FIRE_INTERVAL_MS } from '@/game/settings';
import type { SimulationState, TerritoryState } from '@/game/types';

import { PRODUCTION_AI, type AiConfig } from './config';
import { breachValue } from './defender-strategy';
import { airSupplyRoom, incomingThreat, usefulAirSupply } from './mobility';
import { relayPriority } from './relay-priority';

export type OrderKind = 'expand' | 'attack' | 'reinforce';
export interface AiOrder {
  readonly sourceId: string;
  readonly targetId: string;
  readonly kind: OrderKind;
  readonly score: number;
}

export interface AiOrderEvaluation {
  readonly order: AiOrder | null;
  readonly rejection?: import('./trace').AiTraceBlockReason;
}

export function evaluateOrder(
  state: SimulationState,
  source: TerritoryState,
  target: TerritoryState,
  baseline: SimulationState,
  proposed: SimulationState,
  horizonMs: number,
  config: AiConfig,
  factionId: string,
  distances: ReadonlyMap<string, number>,
  productionGain = 0,
  sentUnits = source.units - 1,
): AiOrderEvaluation {
  if (proposed.outcome && proposed.outcome.winner !== factionId)
    return { order: null, rejection: 'forecast-loses' };
  const before = baseline.territories.find((n) => n.id === target.id)!;
  const after = proposed.territories.find((n) => n.id === target.id)!;
  if (after.owner !== factionId) return { order: null, rejection: 'forecast-cannot-capture' };
  let kind: OrderKind;
  let score: number;
  if (target.owner !== factionId) {
    if (before.owner === factionId) return { order: null, rejection: 'already-secured' };
    kind = target.owner === 'neutral' ? 'expand' : 'attack';
    score = kind === 'expand' ? config.expansionScore : config.attackScore;
    score += Math.min(config.attackScore * 0.5, breachValue(state, target.id, factionId) * 4);
    // Value the extra production from a capturable Factory over a short horizon.
    // Forecast success and source safety still gate the order; no resource bonus.
    const extraProduction =
      getTerritoryGrowthRate(proposed, after) - getFactionRules(state, factionId).unitsPerSecond;
    score += Math.max(0, extraProduction) * 10;
    if (after.cityType === 'artillery' && artilleryTarget(proposed, after))
      score += 10000 / ARTILLERY_FIRE_INTERVAL_MS;
  } else {
    kind = 'reinforce';
    const threatened = incomingThreat(state, target.id, factionId);
    if (threatened) {
      if (before.owner === factionId && before.units > config.defenceBuffer)
        return { order: null, rejection: 'reinforce-no-benefit' };
      if (before.owner === factionId && after.units <= before.units)
        return { order: null, rejection: 'reinforce-no-benefit' };
      score = config.defenceScore;
    } else {
      const advance = distances.get(source.id)! - distances.get(target.id)!;
      const airSupply = usefulAirSupply(state, source, target, factionId);
      if (target.cityType === 'airfield' && airSupplyRoom(state, target, factionId) < sentUnits)
        return { order: null, rejection: 'airfield-full' };
      if (
        !(advance >= config.frontlineAdvance) &&
        productionGain < PRODUCTION_AI.minGain &&
        !airSupply
      )
        return { order: null, rejection: 'not-frontline' };
      // A bounded, strictly increasing bonus favors Factory relief without
      // allowing large economic gains to overwhelm emergency defence scores.
      score =
        config.frontlineScore *
        (1 + productionGain / (productionGain + PRODUCTION_AI.bonusHalfGain));
    }
  }
  const sourceBefore = baseline.territories.find((n) => n.id === source.id)!;
  const sourceAfter = proposed.territories.find((n) => n.id === source.id)!;
  if (sourceBefore.owner === factionId && sourceAfter.owner !== factionId) {
    if (kind === 'reinforce') return { order: null, rejection: 'source-risk' };
    score -= config.sourceLossPenalty;
  }
  score += relayPriority(state, source, target, distances, factionId);
  score -= (horizonMs / 1000) * config.travelCostPerSecond;
  return score > 0
    ? { order: { sourceId: source.id, targetId: target.id, kind, score } }
    : { order: null, rejection: 'non-positive-score' };
}

export function scoreOrder(
  state: SimulationState,
  source: TerritoryState,
  target: TerritoryState,
  baseline: SimulationState,
  proposed: SimulationState,
  horizonMs: number,
  config: AiConfig,
  factionId: string,
  distances: ReadonlyMap<string, number>,
  productionGain = 0,
  sentUnits = source.units - 1,
): AiOrder | null {
  return evaluateOrder(
    state,
    source,
    target,
    baseline,
    proposed,
    horizonMs,
    config,
    factionId,
    distances,
    productionGain,
    sentUnits,
  ).order;
}
