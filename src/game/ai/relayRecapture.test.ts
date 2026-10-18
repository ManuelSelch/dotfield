import { afterEach, expect, it, vi } from 'vitest';
import { createSimulation } from '../state';
import { chooseAction, applyAiAction } from './actions';
import { resolveAiBehavior } from './behaviors';
import { forecastBattle } from './forecast';
import type { SimulationState, Territory } from '../types';
import { dispatchUnits } from '../dispatch';
import { canGroundOrder } from '../groundAccess';
import { chooseRelayRecapture } from './relayRecapture';
import { frontlineDistances } from './logistics';
import type { AiWorkerRequest, AiWorkerResponse } from './worker';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

const city = (id: string, owner: string, units: number, x: number, y: number): Territory => ({ id, owner, units, x, y });
const opening = (factionId = 'enemy'): SimulationState => {
  const initial = createSimulation([
    city('base', factionId, 50, 70, 260), city('east', factionId, 50, 290, 260),
    city('rear', factionId, 50, 180, 340), city('decoy', 'neutral', 3, 60, 350),
    city('relay', 'player', 85, 180, 180), city('player-home', 'player', 50, 180, 40),
  ], undefined, undefined, undefined, { cityId: 'relay', activateAtMs: 120000, targetMs: 180000 });
  return { ...initial, elapsedMs: 288000, relay: { ...initial.relay!, scoresMs: { player: 168000, [factionId]: 0 } } };
};

it.each(['balanced', 'aggressive', 'defensive'] as const)(
  '%s starts a viable multi-city recapture instead of expanding elsewhere', behavior => {
    expect(chooseAction(opening(), resolveAiBehavior(behavior)))
      .toMatchObject({ type: 'ground', kind: 'attack', targetId: 'relay' });
  });

it('follows up the first wave and recaptures before the opponent wins', () => {
  let state = opening();
  const config = resolveAiBehavior('aggressive');
  let relayOrders = 0;
  for (let i = 0; i < 30 && state.roundStatus === 'playing'; i++) {
    const action = chooseAction(state, config);
    if (action) {
      if (action.type === 'ground' && action.targetId === 'relay' && action.kind === 'attack') relayOrders++;
      state = applyAiAction(state, action, 'enemy');
    }
    state = forecastBattle(state, config.decisionIntervalMs);
    if (state.territories.find(c => c.id === 'relay')!.owner === 'enemy') break;
  }
  expect(relayOrders).toBeGreaterThanOrEqual(2);
  expect(state.territories.find(c => c.id === 'relay')?.owner).toBe('enemy');
  expect(state.relay!.scoresMs.player).toBeLessThan(state.relay!.targetMs);
});

const recapture = (state: SimulationState) => chooseRelayRecapture(state, resolveAiBehavior('aggressive'),
  'enemy', frontlineDistances(state, 'enemy'));

it('accounts for Defender shields when deciding how many waves are required', () => {
  const initial = opening();
  let state: SimulationState = { ...initial, elapsedMs: 270000,
    relay: { ...initial.relay!, scoresMs: { player: 150000, enemy: 0 } },
    territories: initial.territories.map(c => c.id === 'relay' ? { ...c, cityType: 'defender' } : c),
    captureShields: { relay: { remaining: 3 } } };
  let waves = 0;
  for (let i = 0; i < 20 && state.roundStatus === 'playing'; i++) {
    const action = chooseAction(state, resolveAiBehavior('aggressive'));
    if (action) {
      if (action.type === 'ground' && action.targetId === 'relay' && action.kind === 'attack') waves++;
      state = applyAiAction(state, action, 'enemy');
    }
    state = forecastBattle(state, 1300);
    if (state.territories.find(c => c.id === 'relay')!.owner === 'enemy') break;
  }
  expect(waves).toBeGreaterThanOrEqual(3);
  expect(state.territories.find(c => c.id === 'relay')?.owner).toBe('enemy');
});

it('keeps an available emergency defense ahead of relay recapture', () => {
  const initial = opening();
  const raider = { ...city('player-raid', 'player', 80, 180, 300), cityType: 'production' as const, growthRemainder: 0 };
  const raided = { ...initial, territories: [...initial.territories, raider] };
  const state = dispatchUnits(raided, 'player-raid', 'rear', 'player');
  expect(chooseAction(state, resolveAiBehavior('aggressive')))
    .toMatchObject({ type: 'ground', kind: 'reinforce', targetId: 'rear' });
});

it('does not start a doomed assault or a plan that arrives after defeat', () => {
  const initial = opening();
  const hopeless = { ...initial, territories: initial.territories.map(c => c.id === 'relay' ? { ...c, units: 1000 } : c) };
  expect(recapture(hopeless)).toBeNull();
  const late = { ...initial, elapsedMs: 299900,
    relay: { ...initial.relay!, scoresMs: { player: 179900, enemy: 0 } } };
  expect(recapture(late)).toBeNull();
});

it('does not change preparation, friendly-held or legacy conquest decisions', () => {
  const initial = opening();
  expect(recapture({ ...initial, elapsedMs: 100000 })).toBeNull();
  expect(recapture({ ...initial, territories: initial.territories.map(c => c.id === 'relay' ? { ...c, owner: 'enemy' } : c) })).toBeNull();
  expect(recapture({ ...initial, relay: undefined })).toBeNull();
});

it('honors hostile Defender borders rather than pretending all donors can reach the relay', () => {
  const initial = opening();
  const state = createSimulation([
    city('base', 'enemy', 50, 70, 400), city('east', 'enemy', 50, 290, 400),
    city('rear', 'enemy', 50, 180, 450), city('relay', 'player', 85, 180, 100),
    ...[60, 180, 300].map((x, i) => ({ ...city(`wall-${i}`, 'player', 10, x, 260), cityType: 'defender' as const })),
  ], undefined, undefined, undefined, initial.relay);
  const active = { ...state, elapsedMs: initial.elapsedMs, relay: initial.relay };
  const target = active.territories.find(c => c.id === 'relay')!;
  expect(active.territories.filter(c => c.owner === 'enemy').every(c => !canGroundOrder(active, c, target))).toBe(true);
  expect(recapture(active)).toBeNull();
});

it('preserves the exposed Network home and leaves the state immutable', () => {
  const initial = opening();
  const state = { ...initial, rules: { factions: { ...initial.rules.factions,
    enemy: { ...initial.rules.factions.enemy, connectedDefense: true } } } };
  const snapshot = structuredClone(state);
  const order = recapture(state);
  expect(order).toMatchObject({ kind: 'attack', targetId: 'relay' });
  expect(order?.sourceId).not.toBe('base');
  const needsHome = { ...state, territories: state.territories.map(c => c.id === 'relay' ? { ...c, units: 120 } : c) };
  expect(recapture(needsHome)).toBeNull();
  expect(state).toEqual(snapshot);
});

it('does not commandeer busy donors or add waves when committed armies already secure the objective', () => {
  const initial = opening();
  const busy = dispatchUnits(dispatchUnits(initial, 'east', 'decoy', 'enemy'), 'rear', 'decoy', 'enemy');
  expect(recapture(busy)).toBeNull();
  const strong = { ...initial, elapsedMs: 240000,
    relay: { ...initial.relay!, scoresMs: { player: 120000, enemy: 0 } },
    territories: initial.territories.map(c => c.id === 'base' ? { ...c, units: 200 } : c) };
  const committed = dispatchUnits(strong, 'base', 'relay', 'enemy');
  expect(recapture(committed)).toBeNull();
});

it.each(['enemy', 'enemy-2'])('worker replans the recapture follow-up for %s with sync parity', async factionId => {
  let state = opening(factionId);
  const config = resolveAiBehavior('aggressive');
  const postMessage = vi.fn();
  const worker = { postMessage, onmessage: (_event: MessageEvent<AiWorkerRequest>) => {} };
  vi.stubGlobal('self', worker);
  await import('./worker');
  const donors = new Set<string>();
  for (let id = 1; id <= 2; id++) {
    const request: AiWorkerRequest = { requestId: id, factionId, config, state: structuredClone(state) };
    const snapshot = structuredClone(request);
    worker.onmessage({ data: request } as MessageEvent<AiWorkerRequest>);
    const response = postMessage.mock.calls.at(-1)![0] as AiWorkerResponse;
    expect(response).toMatchObject({ requestId: id, factionId, action: { type: 'ground', kind: 'attack', targetId: 'relay' } });
    expect(response.action).toEqual(chooseAction(state, config, factionId));
    expect(request).toEqual(snapshot);
    if (response.action && 'sourceId' in response.action) donors.add(response.action.sourceId);
    state = forecastBattle(applyAiAction(state, response.action!, factionId), config.decisionIntervalMs);
  }
  expect(donors.size).toBe(2);
  state = forecastBattle(state, 20000);
  expect(state.territories.find(c => c.id === 'relay')?.owner).toBe(factionId);
  expect(state.relay!.scoresMs.player).toBeLessThan(state.relay!.targetMs);
});
