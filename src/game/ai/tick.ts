import { dispatchUnits } from '../dispatch';
import type { SimulationState } from '../types';
import type { AiConfig } from './config';
import { chooseOrder } from './decision';

export function advanceAi(state: SimulationState, config: AiConfig): SimulationState {
  if (state.roundStatus !== 'playing') return state;
  if (!Number.isFinite(config.decisionIntervalMs) || config.decisionIntervalMs <= 0
    || !Number.isFinite(config.initialDelayMs) || config.initialDelayMs < 0) {
    throw new RangeError('AI decision interval must be positive and initial delay non-negative.');
  }
  const deadline = state.aiNextDecisionMs ?? config.initialDelayMs;
  if (state.elapsedMs < deadline) {
    return state.aiNextDecisionMs === deadline ? state : { ...state, aiNextDecisionMs: deadline };
  }
  const next = { ...state, aiNextDecisionMs: state.elapsedMs + config.decisionIntervalMs };
  const order = chooseOrder(next, config);
  return order ? dispatchUnits(next, order.sourceId, order.targetId, 'enemy') : next;
}
