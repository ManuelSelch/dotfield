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
}

// Economic lookahead and conservative source protection; shared by all behaviors.
// Separate from persisted AiConfig so existing saved rounds need no migration.
export const PRODUCTION_AI = Object.freeze({
  lookAheadMs: 15_000, capLeadMs: 5_000, threatTravelMs: 5_000,
  minGain: 2, bonusHalfGain: 10,
});

// One prototype policy, not difficulty presets. No growth or resource advantages.
export const DEFAULT_AI: AiConfig = {
  initialDelayMs: 1800, decisionIntervalMs: 1800, minDispatchUnits: 6,
  expansionScore: 35, attackScore: 55, defenceScore: 80, frontlineScore: 18,
  sourceLossPenalty: 90, travelCostPerSecond: 1, defenceBuffer: 6,
  frontlineAdvance: 60,
};
