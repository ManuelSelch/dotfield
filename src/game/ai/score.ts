import { riverDistance } from '../river';
import { getTerritoryGrowthRate } from '../features/growthRate';
import { getFactionRules } from '../rules';
import type { SimulationState, TerritoryState } from '../types';
import type { AiConfig } from './config';

export type OrderKind = 'expand' | 'attack' | 'reinforce';
export interface AiOrder { readonly sourceId: string; readonly targetId: string; readonly kind: OrderKind; readonly score: number }

function distanceToHostile(state: SimulationState, node: TerritoryState, factionId: string) {
  return Math.min(...state.territories.filter(t => t.owner !== factionId && t.owner !== 'neutral')
    .map(t => riverDistance(node, t, state.territories, state.river)));
}

export function scoreOrder(state: SimulationState, source: TerritoryState, target: TerritoryState,
  baseline: SimulationState, proposed: SimulationState, horizonMs: number, config: AiConfig, factionId = 'enemy'): AiOrder | null {
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
  } else {
    kind = 'reinforce';
    const threatened = state.transfers.some(t => t.targetId === target.id && t.owner !== factionId);
    if (threatened) {
      if (before.owner === factionId && before.units > config.defenceBuffer) return null;
      if (before.owner === factionId && after.units <= before.units) return null;
      score = config.defenceScore;
    } else {
      if (distanceToHostile(state, source, factionId) - distanceToHostile(state, target, factionId) < config.frontlineAdvance) return null;
      score = config.frontlineScore;
    }
  }
  const sourceBefore = baseline.territories.find(n => n.id === source.id)!;
  const sourceAfter = proposed.territories.find(n => n.id === source.id)!;
  if (sourceBefore.owner === factionId && sourceAfter.owner !== factionId) score -= config.sourceLossPenalty;
  score -= horizonMs / 1000 * config.travelCostPerSecond;
  return score > 0 ? { sourceId: source.id, targetId: target.id, kind, score } : null;
}
