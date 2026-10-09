import { dispatchUnits } from '../dispatch';
import type { FactionId, SimulationState } from '../types';
import type { AiConfig } from './config';
import { chooseOrder } from './decision';

export type AiConfigurations = Readonly<Partial<Record<FactionId, AiConfig>>>;
const isConfig = (value: AiConfig | AiConfigurations): value is AiConfig => 'decisionIntervalMs' in value;

export function advanceAi(state: SimulationState, input: AiConfig | AiConfigurations): SimulationState {
  if (state.roundStatus !== 'playing') return state;
  const configs: AiConfigurations = isConfig(input) ? { enemy: input } : input;
  let next = state;
  for (const factionId of Object.keys(configs).sort()) {
    const config = configs[factionId];
    if (!config || !next.rules.factions[factionId]) continue;
    if (!Number.isFinite(config.decisionIntervalMs) || config.decisionIntervalMs <= 0
      || !Number.isFinite(config.initialDelayMs) || config.initialDelayMs < 0) {
      throw new RangeError('AI decision interval must be positive and initial delay non-negative.');
    }
    const deadline = next.aiDecisionDeadlines[factionId] ?? config.initialDelayMs;
    if (next.elapsedMs < deadline) {
      if (next.aiDecisionDeadlines[factionId] !== deadline) next = { ...next,
        aiDecisionDeadlines: { ...next.aiDecisionDeadlines, [factionId]: deadline },
        ...(factionId === 'enemy' ? { aiNextDecisionMs: deadline } : {}) };
      continue;
    }
    const nextDeadline = next.elapsedMs + config.decisionIntervalMs;
    next = { ...next, aiDecisionDeadlines: { ...next.aiDecisionDeadlines, [factionId]: nextDeadline },
      ...(factionId === 'enemy' ? { aiNextDecisionMs: nextDeadline } : {}) };
    const order = chooseOrder(next, config, factionId);
    if (order) next = dispatchUnits(next, order.sourceId, order.targetId, factionId);
  }
  return next;
}
