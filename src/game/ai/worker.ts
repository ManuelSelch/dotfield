import { chooseOrder } from './decision';
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
  readonly order: ReturnType<typeof chooseOrder>;
}

self.onmessage = (event: MessageEvent<AiWorkerRequest>) => {
  const { requestId, state, factionId, config } = event.data;
  const order = chooseOrder(state, config, factionId);
  self.postMessage({ requestId, factionId, order } satisfies AiWorkerResponse);
};
