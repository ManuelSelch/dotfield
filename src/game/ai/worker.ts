import { chooseActionWithTrace, type AiAction } from './actions';
import type { AiDecisionTrace } from './trace';
import type { AiOrder } from './score';
import type { AiConfig } from './config';
import type { FactionId, SimulationState } from '../types';

export interface AiWorkerRequest {
  readonly requestId: number;
  readonly state: SimulationState;
  readonly factionId: FactionId;
  readonly config: AiConfig;
}

export interface AiWorkerResponse {
  readonly requestId: number;
  readonly factionId: FactionId;
  readonly action: AiAction | null;
  readonly trace: AiDecisionTrace;
  /** Compatibility for ground-only coordinators. New consumers execute action. */
  readonly order: AiOrder | null;
}

self.onmessage = (event: MessageEvent<AiWorkerRequest>) => {
  const { requestId, state, factionId, config } = event.data;
  const { action, trace } = chooseActionWithTrace(state, config, factionId);
  const order = action?.type === 'ground' ? { sourceId: action.sourceId, targetId: action.targetId,
    kind: action.kind, score: action.score } : null;
  self.postMessage({ requestId, factionId, action, trace, order } satisfies AiWorkerResponse);
};
