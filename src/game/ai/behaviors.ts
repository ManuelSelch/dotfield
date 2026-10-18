import { DEFAULT_AI, type AiConfig } from './config';

export type AiBehavior = 'balanced' | 'aggressive' | 'defensive';

export function resolveAiBehavior(behavior: AiBehavior = 'balanced'): AiConfig {
  if (behavior === 'aggressive') return { ...DEFAULT_AI, productionThreatTravelMs: 3000, roleConversionPenalty: 15, decisionIntervalMs: 1300,
    expansionScore: 42, attackScore: 72, defenceScore: 60, travelCostPerSecond: 0.6 };
  if (behavior === 'defensive') return { ...DEFAULT_AI, decisionIntervalMs: 2200,
    expansionScore: 25, attackScore: 40, defenceScore: 100, defenceBuffer: 10,
    sourceLossPenalty: 130, travelCostPerSecond: 1.4 };
  return { ...DEFAULT_AI };
}
