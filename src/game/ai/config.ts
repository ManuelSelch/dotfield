export interface AiConfig {
  readonly initialDelayMs: number;
  readonly decisionIntervalMs: number;
  readonly minDispatchUnits: number;
  readonly expansionScore: number;
  readonly attackScore: number;
  readonly defenceScore: number;
  readonly frontlineScore: number;
  readonly sourceLossPenalty: number;
  readonly travelCostPerSecond: number;
  readonly defenceBuffer: number;
  readonly frontlineAdvance: number;
  // Aggressive behavior delays optional role investment when a feasible attack exists.
  readonly roleConversionPenalty?: number;
  // Optional for saved rounds compiled before behavior-specific logistics.
  readonly productionThreatTravelMs?: number;
}

// Shared economic defaults; behaviors may override the production threat window.
// Missing overrides in existing saved AiConfig values retain these defaults.
export const PRODUCTION_AI = Object.freeze({
  lookAheadMs: 15_000,
  capLeadMs: 5_000,
  threatTravelMs: 5_000,
  minGain: 2,
  bonusHalfGain: 10,
});

// Hard wall-clock cap for one worker decision. The enumerators return their
// best-so-far when it expires, so a large board stays responsive.
export const AI_DECISION_BUDGET_MS = 1_500;

// One prototype policy, not difficulty presets. No growth or resource advantages.
export const DEFAULT_AI: AiConfig = {
  initialDelayMs: 1800,
  decisionIntervalMs: 1800,
  minDispatchUnits: 6,
  expansionScore: 35,
  attackScore: 55,
  defenceScore: 80,
  frontlineScore: 18,
  sourceLossPenalty: 90,
  travelCostPerSecond: 1,
  defenceBuffer: 6,
  frontlineAdvance: 60,
};
