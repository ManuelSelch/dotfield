import { chooseAction, type AiAction } from './actions';
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
  /** Compatibility for ground-only coordinators. New consumers execute action. */
  readonly order: AiOrder | null;
}

self.onmessage = (event: MessageEvent<AiWorkerRequest>) => {
  const { requestId, state, factionId, config } = event.data;
  const action = chooseAction(state, config, factionId);
  const order = action?.type === 'ground' ? { sourceId: action.sourceId, targetId: action.targetId,
    kind: action.kind, score: action.score } : null;
  self.postMessage({ requestId, factionId, action, order } satisfies AiWorkerResponse);
};
