import type { SimulationState, TerritoryState } from '../types';
import type { AiConfig } from './config';

export type OrderKind = 'expand' | 'attack' | 'reinforce';
export interface AiOrder { readonly sourceId: string; readonly targetId: string; readonly kind: OrderKind; readonly score: number }

function distanceToPlayer(state: SimulationState, node: TerritoryState) {
  return Math.min(...state.territories.filter(t => t.owner === 'player')
    .map(t => Math.hypot(t.x - node.x, t.y - node.y)));
}

export function scoreOrder(state: SimulationState, source: TerritoryState, target: TerritoryState,
  baseline: SimulationState, proposed: SimulationState, horizonMs: number, config: AiConfig): AiOrder | null {
  const before = baseline.territories.find(n => n.id === target.id)!;
  const after = proposed.territories.find(n => n.id === target.id)!;
  if (after.owner !== 'enemy') return null;
  let kind: OrderKind;
  let score: number;
  if (target.owner !== 'enemy') {
    if (before.owner === 'enemy') return null; // Existing troops already secure this region.
    kind = target.owner === 'neutral' ? 'expand' : 'attack';
    score = kind === 'expand' ? config.expansionScore : config.attackScore;
  } else {
    kind = 'reinforce';
    const threatened = state.transfers.some(t => t.targetId === target.id && t.owner === 'player');
    if (threatened) {
      if (before.owner === 'enemy' && before.units > config.defenceBuffer) return null;
      if (before.owner === 'enemy' && after.units <= before.units) return null;
      score = config.defenceScore;
    } else {
      if (distanceToPlayer(state, source) - distanceToPlayer(state, target) < config.frontlineAdvance) return null;
      score = config.frontlineScore;
    }
  }
  const sourceBefore = baseline.territories.find(n => n.id === source.id)!;
  const sourceAfter = proposed.territories.find(n => n.id === source.id)!;
  if (sourceBefore.owner === 'enemy' && sourceAfter.owner !== 'enemy') score -= config.sourceLossPenalty;
  score -= horizonMs / 1000 * config.travelCostPerSecond;
  return score > 0 ? { sourceId: source.id, targetId: target.id, kind, score } : null;
}
