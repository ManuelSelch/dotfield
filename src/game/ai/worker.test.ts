import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSimulation } from '../state';
import { advanceWorldStep } from '../worldStep';
import { createTerrain } from '../terrain/terrain';
import { chooseAction, chooseActionWithTrace, applyAiAction } from './actions';
import { DEFAULT_AI } from './config';
import { advanceAi } from './tick';
import type { AiWorkerRequest, AiWorkerResponse } from './worker';

const terrain = createTerrain({ bounds: { minX: -100, minY: -100, maxX: 600, maxY: 600 }, crossings: [],
  barriers: [{ id: 'ridge', kind: 'mountain', bounds: { minX: 150, minY: -90, maxX: 180, maxY: 590 } }] });

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe.each([false, true])('worker action contract (relay %s)', relay => {
  it.each(['ground', 'airlift', 'convert'] as const)('returns the same %s command as sync, preserving snapshots and request identity', async type => {
    const factionId = 'enemy-2';
    const nodes = [
      { id: 'home', owner: factionId, units: 50, x: 0, y: 400 },
      { id: 'rear', owner: factionId, units: 50, x: 0, y: 300 },
      { id: 'launch', owner: factionId, units: 90, x: 0, y: 0, cityType: type === 'airlift' ? 'airfield' as const : 'production' as const },
      { id: 'target', owner: 'player', units: 12, x: 300, y: 0 },
    ];
    const state = advanceWorldStep(createSimulation(nodes, { unitsPerSecond: 0 }, undefined,
      type === 'ground' ? undefined : terrain, relay ? { cityId: 'target', activateAtMs: 120000, targetMs: 180000 } : undefined), 20_000);
    const request: AiWorkerRequest = { requestId: 42, factionId, config: DEFAULT_AI, state: structuredClone(state) };
    const snapshot = structuredClone(request);
    const postMessage = vi.fn();
    const worker = { postMessage, onmessage: (_event: MessageEvent<AiWorkerRequest>) => {} };
    vi.stubGlobal('self', worker);
    await import('./worker');
    worker.onmessage({ data: request } as MessageEvent<AiWorkerRequest>);
    const response = postMessage.mock.calls[0][0] as AiWorkerResponse;
    expect(response).toMatchObject({ requestId: 42, factionId, action: { type } });
    expect(response.action).toEqual(chooseAction(state, DEFAULT_AI, factionId));
    expect(response.trace).toEqual(chooseActionWithTrace(state, DEFAULT_AI, factionId).trace);
    expect(response.order).toEqual(type === 'ground' ? expect.objectContaining({ sourceId: expect.any(String) }) : null);
    const sync = advanceAi(state, { [factionId]: DEFAULT_AI });
    const applied = applyAiAction(state, response.action!, factionId);
    expect(applied.territories).toEqual(sync.territories);
    expect(applied.transfers).toEqual(sync.transfers);
    expect(applied.aircraft).toEqual(sync.aircraft);
    expect(request).toEqual(snapshot);
  });
});
