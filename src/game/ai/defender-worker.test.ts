import { afterEach, expect, it, vi } from 'vitest';

import { dispatchUnits } from '@/game/dispatch';
import { canGroundOrder } from '@/game/ground-access';
import { createSimulation } from '@/game/state';

import { chooseAction, applyAiAction } from './actions';
import { DEFAULT_AI } from './config';
import type { AiWorkerRequest, AiWorkerResponse } from './worker';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
it.each(['enemy', 'enemy-2'])(
  'worker and sync attack the same reachable blocker for %s and reject a stale transit action',
  async (factionId) => {
    const state = createSimulation(
      [
        { id: 'army', owner: factionId, units: 60, x: 40, y: 240 },
        { id: 'wall', owner: 'player', units: 1, x: 180, y: 240, cityType: 'defender' },
        { id: 'rear', owner: 'player', units: 1, x: 320, y: 240 },
      ],
      { unitsPerSecond: 0 },
    );
    const request: AiWorkerRequest = {
      requestId: 7,
      factionId,
      config: DEFAULT_AI,
      state: structuredClone(state),
    };
    const postMessage = vi.fn(),
      worker = { postMessage, onmessage: (_e: MessageEvent<AiWorkerRequest>) => {} };
    vi.stubGlobal('self', worker);
    await import('./worker');
    worker.onmessage({ data: request } as MessageEvent<AiWorkerRequest>);
    const response = postMessage.mock.calls[0][0] as AiWorkerResponse;
    expect(response.action).toEqual(chooseAction(state, DEFAULT_AI, factionId));
    expect(response.action).toMatchObject({ type: 'ground', targetId: 'wall' });
    expect(canGroundOrder(state, state.territories[0], state.territories[2])).toBe(false);
    expect(
      applyAiAction(
        state,
        { ...response.action!, type: 'ground', sourceId: 'army', targetId: 'rear', kind: 'attack' },
        factionId,
      ),
    ).toBe(state);
    expect(applyAiAction(state, response.action!, factionId)).toEqual(
      dispatchUnits(state, 'army', 'wall', factionId),
    );
    expect(request.state).toEqual(state);
  },
);
