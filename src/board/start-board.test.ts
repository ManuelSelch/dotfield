import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_AI, type AiConfig } from '@/game/ai/config';
import { AiDecisionTraceCollector } from '@/game/ai/trace';
import type { AiWorkerRequest, AiWorkerResponse } from '@/game/ai/worker';
import * as roundRules from '@/game/round';
import { TERRITORY_RADIUS, TRAVEL_SPEED } from '@/game/settings';
import { createSnapshotSaver } from '@/game/snapshot-saver';
import type { SimulationState } from '@/game/types';

import { bindDrag } from './bind-drag';
import { bindKeyboard } from './bind-keyboard';
import { drawBoard } from './draw-board';
import { TERRITORIES } from './map';
import { startBoard } from './start-board';

vi.mock('./draw-board', () => ({ drawBoard: vi.fn() }));
vi.mock('./bind-drag', () => ({
  bindDrag: vi.fn(() => ({ cancel: vi.fn(), validate: vi.fn(), dispose: vi.fn() })),
}));
vi.mock('./bind-keyboard', () => ({
  bindKeyboard: vi.fn(() => ({ cancel: vi.fn(), validate: vi.fn(), dispose: vi.fn() })),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function harness(
  territories = TERRITORIES,
  ai: AiConfig | null = null,
  autoStart = true,
  search = '',
) {
  let callback = (_time: number) => {};
  const request = vi.fn((next: (time: number) => void) => {
    callback = next;
    return 1;
  });
  const cancel = vi.fn();
  const disconnect = vi.fn();
  const observe = vi.fn();
  const document = Object.assign(new EventTarget(), { hidden: false });
  const window = Object.assign(new EventTarget(), { devicePixelRatio: 1, location: { search } });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', window);
  let onResize = () => {};
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        onResize = callback;
      }
      observe = observe;
      disconnect = disconnect;
    },
  );
  let bounds = { width: 360, height: 480 };
  const focus = vi.fn();
  const parentElement = Object.assign(new EventTarget(), {
    querySelectorAll: () => [{ dataset: { cityId: 'south' }, focus }],
  });
  const canvas = {
    parentElement,
    getBoundingClientRect: () => bounds,
  } as unknown as HTMLCanvasElement;
  const onCounts = vi.fn();
  const onSnapshot = vi.fn();
  const onCitySelection = vi.fn();
  const onFeedback = vi.fn();
  const onAiDecision = vi.fn();
  const onAiActivity = vi.fn();
  const stop = startBoard(canvas, onCounts, territories, ai, {
    autoStart,
    onSnapshot,
    onCitySelection,
    onFeedback,
    onAiDecision,
    onAiActivity,
  });
  return {
    onAiDecision,
    onAiActivity,
    onFeedback,
    focus,
    onCitySelection,
    setBounds: (width: number, height: number) => {
      bounds = { width, height };
    },
    resize: (width = 360, height = 480) => {
      bounds = { width, height };
      onResize();
    },
    frame: (time: number) => callback(time),
    document,
    window,
    request,
    cancel,
    disconnect,
    onCounts,
    onSnapshot,
    stop,
  };
}

describe('worker dashboard lifecycle', () => {
  function workerHarness() {
    class WorkerStub {
      static instance: WorkerStub;
      constructor() {
        WorkerStub.instance = this;
      }
      postMessage = vi.fn<(request: AiWorkerRequest) => void>();
      terminate = vi.fn();
      onmessage?: (event: { data: AiWorkerResponse }) => void;
      onerror?: () => void;
      onmessageerror?: () => void;
    }
    vi.stubGlobal('Worker', WorkerStub);
    const board = harness(TERRITORIES, DEFAULT_AI);
    board.frame(0);
    board.frame(1850);
    return { board, worker: WorkerStub.instance };
  }
  it('publishes pending status before replies and counts repeated no-action results', () => {
    const { board, worker } = workerHarness();
    expect(worker.postMessage).toHaveBeenCalledOnce();
    expect(board.onAiActivity.mock.lastCall![0].enemy.pendingSinceMs).toEqual(expect.any(Number));
    board.frame(2000);
    expect(worker.postMessage).toHaveBeenCalledOnce();
    const reply = () =>
      worker.onmessage!({
        data: {
          requestId: worker.postMessage.mock.lastCall![0].requestId,
          factionId: 'enemy',
          action: null,
          order: null,
          trace: new AiDecisionTraceCollector().finish(null),
        },
      });
    reply();
    expect(board.onAiDecision.mock.lastCall![0]).toMatchObject({
      action: null,
      evaluation: 1,
      outcome: 'no-command',
      noActionCount: 1,
    });
    expect(board.onAiActivity.mock.lastCall![0].enemy.pendingSinceMs).toBeUndefined();
    board.frame(4000);
    reply();
    expect(board.onAiDecision.mock.lastCall![0]).toMatchObject({ evaluation: 2, noActionCount: 2 });
    const completed = board.onAiActivity.mock.lastCall![0].enemy.elapsedMs;
    board.stop.pause();
    board.frame(9000);
    expect(board.onAiActivity.mock.lastCall![0].enemy).toMatchObject({
      phase: 'paused',
      elapsedMs: completed,
    });
    board.stop();
  });
  it('records actual command acceptance rather than just an attack selection', () => {
    const { board, worker } = workerHarness();
    const action = {
      type: 'ground' as const,
      kind: 'attack' as const,
      sourceId: 'missing',
      targetId: 'south',
      score: 55,
    };
    worker.onmessage!({
      data: {
        requestId: worker.postMessage.mock.lastCall![0].requestId,
        factionId: 'enemy',
        action,
        order: action,
        trace: new AiDecisionTraceCollector().finish(action),
      },
    });
    expect(board.onAiDecision.mock.lastCall![0]).toMatchObject({ action, outcome: 'rejected' });
    board.frame(4000);
    const legal = { ...action, sourceId: 'north', targetId: 'centre', kind: 'expand' as const };
    worker.onmessage!({
      data: {
        requestId: worker.postMessage.mock.lastCall![0].requestId,
        factionId: 'enemy',
        action: legal,
        order: legal,
        trace: new AiDecisionTraceCollector().finish(legal),
      },
    });
    expect(board.onAiDecision.mock.lastCall![0]).toMatchObject({
      outcome: 'applied',
      evaluation: 2,
    });
    board.stop();
  });
  it('keeps an in-flight evaluation visible through pause and records non-application honestly', () => {
    const { board, worker } = workerHarness();
    const requestId = worker.postMessage.mock.lastCall![0].requestId;
    board.stop.pause();
    expect(board.onAiActivity.mock.lastCall![0].enemy.pendingSinceMs).toEqual(expect.any(Number));
    const action = {
      type: 'ground' as const,
      kind: 'expand' as const,
      sourceId: 'north',
      targetId: 'centre',
      score: 55,
    };
    worker.onmessage!({
      data: {
        requestId,
        factionId: 'enemy',
        action,
        order: action,
        trace: new AiDecisionTraceCollector().finish(action),
      },
    });
    expect(board.onAiDecision.mock.lastCall![0]).toMatchObject({ action, outcome: 'inactive' });
    expect(board.onCounts.mock.lastCall![0].transfers).toHaveLength(0);
    expect(board.onAiActivity.mock.lastCall![0].enemy).toMatchObject({
      phase: 'paused',
      pendingSinceMs: undefined,
    });
    board.stop.resume();
    board.frame(5000);
    board.frame(7000);
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
    board.stop();
  });
  it('publishes the terminal status even inside the heartbeat throttle window', () => {
    const { board } = workerHarness();
    const before: SimulationState = board.onCounts.mock.lastCall![0];
    const spy = vi
      .spyOn(roundRules, 'advanceRound')
      .mockReturnValueOnce({ ...before, roundStatus: 'victory' });
    board.frame(1900);
    expect(board.onAiActivity.mock.lastCall![0].enemy.playing).toBe(false);
    spy.mockRestore();
    board.stop();
  });
  it('reports worker errors and ignores late results after restart or disposal', () => {
    const { board, worker } = workerHarness();
    const requestId = worker.postMessage.mock.lastCall![0].requestId;
    worker.onerror!();
    expect(board.onAiActivity.mock.lastCall![0].enemy.error).toBe(true);
    board.stop.restart();
    worker.onmessage!({
      data: {
        requestId,
        factionId: 'enemy',
        action: null,
        order: null,
        trace: new AiDecisionTraceCollector().finish(null),
      },
    });
    expect(board.onAiDecision).not.toHaveBeenCalled();
    board.stop();
  });
});

describe('MDSL prototype connection', () => {
  it('opts in without starting the legacy worker and preserves a plan through pause and resume', () => {
    const worker = vi.fn();
    vi.stubGlobal('Worker', worker);
    const log = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const board = harness(TERRITORIES, DEFAULT_AI, true, '?bot=mdsl');
    board.frame(0);
    board.frame(1850);
    expect(worker).not.toHaveBeenCalled();
    const first: SimulationState = board.onCounts.mock.lastCall![0];
    expect(first.transfers.some((t) => t.owner === 'enemy')).toBe(true);
    expect(log.mock.calls.filter((call) => call[1]?.outcome === 'dispatched')).toHaveLength(1);
    board.stop.pause();
    board.frame(50000);
    expect(board.onCounts.mock.lastCall![0]).toBe(first);
    board.stop.resume();
    board.frame(51000);
    board.frame(51200);
    expect(log.mock.calls.filter((call) => call[1]?.outcome === 'dispatched')).toHaveLength(1);
    board.stop();
    log.mockRestore();
  });
  it('drops prototype state on restart and does not step while hidden or disposed', () => {
    const log = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const board = harness(TERRITORIES, DEFAULT_AI, true, '?bot=mdsl');
    board.frame(0);
    board.frame(1850);
    const events = log.mock.calls.length;
    board.document.hidden = true;
    board.document.dispatchEvent(new Event('visibilitychange'));
    board.frame(60000);
    expect(log).toHaveBeenCalledTimes(events);
    board.document.hidden = false;
    board.document.dispatchEvent(new Event('visibilitychange'));
    board.stop.restart();
    board.stop.start();
    board.frame(70000);
    board.frame(71850);
    expect(log.mock.calls.filter((call) => call[1]?.outcome === 'dispatched')).toHaveLength(2);
    const afterRestart = log.mock.calls.length;
    board.stop();
    board.frame(80000);
    expect(log).toHaveBeenCalledTimes(afterRestart);
    log.mockRestore();
  });
});

describe('board lifecycle adapter', () => {
  it('retains rejected-order feedback through keyboard target focus restoration', () => {
    const board = harness([
      { id: 'source', owner: 'player', units: 40, x: 40, y: 240 },
      { id: 'wall', owner: 'enemy', units: 10, x: 180, y: 240, cityType: 'defender' },
      { id: 'rear', owner: 'enemy', units: 10, x: 320, y: 240 },
    ]);
    const notify = vi.mocked(bindKeyboard).mock.lastCall![3];
    const dispatch = vi.mocked(bindKeyboard).mock.lastCall![4];
    dispatch('source', 'rear');
    expect(board.onFeedback.mock.lastCall![0]).toContain('Defender wall');
    notify({ sourceId: '', targetId: null, focusId: 'rear', point: { x: 320, y: 240 } });
    expect(board.onFeedback.mock.lastCall![0]).toContain('Defender wall');
    notify(null);
    expect(board.onFeedback).toHaveBeenLastCalledWith('');
    board.stop();
  });
  it('opens management, persists converted roles, and clears it on pause', () => {
    const board = harness();
    const options = vi.mocked(bindDrag).mock.lastCall![5]!;
    options.onOwnedCityTap!('south');
    expect(board.onCitySelection).toHaveBeenLastCalledWith({ cityId: 'south', targeting: null });
    const snapshots = board.onSnapshot.mock.calls.length;
    board.stop.convert('defender');
    expect(
      board.onCounts.mock.lastCall![0].territories.find((c: { id: string }) => c.id === 'south'),
    ).toMatchObject({ cityType: 'defender', units: 16 });
    expect(board.onSnapshot).toHaveBeenCalledTimes(snapshots + 1);
    expect(board.onSnapshot).toHaveBeenLastCalledWith(
      board.onCounts.mock.lastCall![0],
      'running',
      true,
    );
    board.stop.pause();
    expect(board.onCitySelection).toHaveBeenLastCalledWith(null);
    board.stop();
  });
  it('keeps management open for a mouse source replacing keyboard selection, but toggles on touch', () => {
    const board = harness();
    const options = vi.mocked(bindDrag).mock.lastCall![5]!;
    options.onOwnedCityTap!('south', 'keyboard');
    options.onOwnedCityTap!('south', 'mouse');
    board.resize(360, 300);
    expect(board.onCitySelection).toHaveBeenLastCalledWith({ cityId: 'south', targeting: null });
    expect(vi.mocked(bindDrag).mock.results.at(-1)!.value.cancel).not.toHaveBeenCalled();
    options.onOwnedCityTap!('south', 'touch');
    expect(board.onCitySelection).toHaveBeenLastCalledWith(null);
    board.stop();
  });
  it('clears keyboard highlights after restoring focus on targeting cancellation and close', async () => {
    const board = harness();
    const options = vi.mocked(bindDrag).mock.lastCall![5]!;
    const select = vi.mocked(bindKeyboard).mock.lastCall![3];
    const keyboard = vi.mocked(bindKeyboard).mock.results.at(-1)!.value;
    keyboard.cancel.mockImplementation(() => select(null));
    board.focus.mockImplementation(() =>
      select({ sourceId: '', focusId: 'south', targetId: null, point: { x: 180, y: 440 } }),
    );
    options.onOwnedCityTap!('south', 'mouse');
    board.stop.target('ground');
    board.stop.cancelTarget();
    expect(board.focus).toHaveBeenCalledOnce();
    expect(vi.mocked(drawBoard).mock.lastCall![5]).toBeNull();
    board.stop.closeCity();
    await Promise.resolve(); // Post-management-layout repaint must also stay clear.
    expect(board.focus).toHaveBeenCalledTimes(2);
    expect(vi.mocked(drawBoard).mock.lastCall![5]).toBeNull();
    board.stop();
  });
  it('repaints after management removal commits its restored layout without an observer callback', async () => {
    const board = harness();
    vi.mocked(bindDrag).mock.lastCall![5]!.onOwnedCityTap!('south', 'mouse');
    board.resize(360, 300);
    board.onCitySelection.mockImplementation((selection) => {
      if (!selection) queueMicrotask(() => board.setBounds(360, 480));
    });
    board.stop.closeCity();
    await Promise.resolve();
    expect(vi.mocked(drawBoard).mock.lastCall!.slice(2, 4)).toEqual([360, 480]);
    expect(vi.mocked(drawBoard).mock.lastCall![5]).toBeNull();
    board.stop();
  });
  it('cancels explicit targeting and rejects a fly command before readiness', () => {
    const board = harness();
    const options = vi.mocked(bindDrag).mock.lastCall![5]!;
    options.onOwnedCityTap!('south');
    board.stop.convert('airfield');
    board.stop.target('fly');
    expect(options.getTargetMode!()).toBeNull();
    board.stop.target('ground');
    expect(options.getTargetMode!()).toBe('ground');
    board.stop.cancelTarget();
    expect(options.getTargetMode!()).toBeNull();
    board.stop.closeCity();
    expect(board.onCitySelection).toHaveBeenLastCalledWith(null);
    board.stop();
  });
  it('revalidates selection every frame and cancels on page exit', () => {
    const board = harness();
    const input = vi.mocked(bindDrag).mock.results.at(-1)!.value;
    board.frame(0);
    board.frame(100);
    expect(input.validate).toHaveBeenCalledTimes(2);
    board.window.dispatchEvent(new Event('pagehide'));
    expect(input.cancel).toHaveBeenCalledOnce();
    board.stop();
  });
  it('validates against newly captured or depleted source state, not the previous frame', () => {
    for (const [owner, units] of [
      ['enemy', 36],
      ['player', 1],
    ] as const) {
      const board = harness();
      const input = vi.mocked(bindDrag).mock.results.at(-1)!.value;
      const before: SimulationState = board.onCounts.mock.lastCall![0];
      const next = {
        ...before,
        territories: before.territories.map((node) =>
          node.id === 'south' ? { ...node, owner, units } : node,
        ),
      };
      input.validate.mockImplementation(() => {
        const nodes = vi.mocked(bindDrag).mock.lastCall![1]();
        expect(nodes.find((node) => node.id === 'south')).toMatchObject({ owner, units });
      });
      const spy = vi.spyOn(roundRules, 'advanceRound').mockReturnValueOnce(next);
      board.frame(0);
      expect(input.validate).toHaveBeenCalledOnce();
      spy.mockRestore();
      board.stop();
    }
  });
  it('forces latest snapshots on hide and page exit without advancing time', () => {
    const board = harness();
    board.frame(0);
    board.frame(100);
    const dispatch = vi.mocked(bindDrag).mock.lastCall![3];
    dispatch('south', 'centre');
    const latest = board.onCounts.mock.lastCall![0];
    board.document.hidden = true;
    board.document.dispatchEvent(new Event('visibilitychange'));
    expect(board.onSnapshot).toHaveBeenLastCalledWith(latest, 'running', true);
    board.window.dispatchEvent(new Event('pagehide'));
    expect(board.onSnapshot).toHaveBeenLastCalledWith(latest, 'running', true);
    expect(board.onSnapshot.mock.lastCall![0].elapsedMs).toBe(100);
    const snapshots = board.onSnapshot.mock.calls.length;
    board.stop();
    board.window.dispatchEvent(new Event('pagehide'));
    board.document.dispatchEvent(new Event('visibilitychange'));
    expect(board.onSnapshot).toHaveBeenCalledTimes(snapshots);
  });

  it('saves an unsaved order on hide and cannot recreate a cleared save after disposal', () => {
    const board = harness();
    const write = vi.fn();
    board.onSnapshot.mockImplementation(createSnapshotSaver(write));
    board.frame(0);
    board.frame(100);
    vi.mocked(bindDrag).mock.lastCall![3]('south', 'centre');
    expect(write).not.toHaveBeenCalled();
    board.document.hidden = true;
    board.document.dispatchEvent(new Event('visibilitychange'));
    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.lastCall![0].transfers).toHaveLength(7);
    // Home clears storage and disposes this adapter; no delayed/event write may revive it.
    write.mockClear();
    board.stop();
    board.window.dispatchEvent(new Event('pagehide'));
    board.document.dispatchEvent(new Event('visibilitychange'));
    board.frame(200);
    expect(write).not.toHaveBeenCalled();
  });

  it('forces phase changes but does not force every frame', () => {
    const board = harness();
    expect(board.onSnapshot).toHaveBeenLastCalledWith(expect.anything(), 'running', true);
    const snapshots = board.onSnapshot.mock.calls.length;
    board.frame(0);
    board.frame(1000);
    expect(board.onSnapshot).toHaveBeenCalledTimes(snapshots);
    board.stop.pause();
    expect(board.onSnapshot).toHaveBeenLastCalledWith(expect.anything(), 'paused', true);
    board.stop.resume();
    expect(board.onSnapshot).toHaveBeenLastCalledWith(expect.anything(), 'running', true);
    board.stop();
  });

  it('preserves click-to-click selection through the management bar resize but cancels on a window resize', () => {
    const board = harness();
    const input = vi.mocked(bindDrag).mock.results.at(-1)!.value;
    vi.mocked(bindDrag).mock.lastCall![5]!.onOwnedCityTap!('south');
    board.resize(360, 300);
    expect(input.cancel).not.toHaveBeenCalled();
    board.window.dispatchEvent(new Event('resize'));
    expect(input.cancel).toHaveBeenCalledOnce();
    board.stop();
  });
  it('does not cancel first input on the initial same-size observer notification', () => {
    const board = harness();
    const input = vi.mocked(bindDrag).mock.results.at(-1)!.value;
    board.resize();
    expect(input.cancel).not.toHaveBeenCalled();
    board.resize(320, 400);
    expect(input.cancel).toHaveBeenCalledOnce();
    board.resize(320, 400);
    expect(input.cancel).toHaveBeenCalledOnce();
    board.stop();
  });
  it('starts ready, pauses input and frames, restarts cleanly and ignores disposed commands', () => {
    const board = harness(TERRITORIES, null, false);
    const [_, getTerritories, __, dispatch] = vi.mocked(bindDrag).mock.lastCall!;
    expect(board.request).not.toHaveBeenCalled();
    expect(getTerritories()).toEqual([]);
    board.stop.start();
    board.frame(0);
    dispatch('south', 'centre');
    board.frame(250);
    board.stop.pause();
    const paused = board.onCounts.mock.lastCall![0];
    const requests = board.request.mock.calls.length;
    board.frame(60000);
    dispatch('south', 'north');
    board.document.hidden = true;
    board.document.dispatchEvent(new Event('visibilitychange'));
    board.document.hidden = false;
    board.document.dispatchEvent(new Event('visibilitychange'));
    expect(board.request).toHaveBeenCalledTimes(requests);
    expect(getTerritories()).toEqual([]);
    board.stop.resume();
    board.frame(61000);
    board.frame(61100);
    board.stop.restart();
    expect(board.onCounts.mock.lastCall![0]).toMatchObject({
      elapsedMs: 0,
      transfers: [],
      nextTransferId: 1,
    });
    expect(board.onCounts.mock.lastCall![0]).not.toBe(paused);
    expect(getTerritories()).toEqual([]);
    board.stop();
    const stoppedRequests = board.request.mock.calls.length;
    board.stop.start();
    board.stop.resume();
    board.frame(100000);
    expect(board.request).toHaveBeenCalledTimes(stoppedRequests);
  });
  it('publishes partial dot losses even if group count and territory counters do not change', () => {
    const board = harness([
      { id: 'source', owner: 'player', units: 6, x: 0, y: 0 },
      { id: 'target', owner: 'enemy', units: 20, x: 300, y: 0 },
    ]);
    const dispatch = vi.mocked(bindDrag).mock.lastCall![3];
    dispatch('source', 'target');
    const before: SimulationState = board.onCounts.mock.lastCall![0];
    const after = {
      ...before,
      transfers: [{ ...before.transfers[0], units: 4, dotSlots: [0, 1, 3, 4] }],
    };
    const spy = vi.spyOn(roundRules, 'advanceRound').mockReturnValueOnce(after);
    const publications = board.onCounts.mock.calls.length;
    board.frame(0);
    expect(board.onCounts).toHaveBeenCalledTimes(publications + 1);
    expect(board.onCounts.mock.lastCall![0]).toBe(after);
    spy.mockRestore();
    board.stop();
  });

  it('publishes charge-only changes and animates feedback without continuous React updates', () => {
    const board = harness();
    const before: SimulationState = board.onCounts.mock.lastCall![0];
    const shielded = {
      ...before,
      captureShields: { south: { remaining: 2, blockedAt: 0, blockedFrom: 3 } },
    };
    const spy = vi.spyOn(roundRules, 'advanceRound').mockReturnValueOnce(shielded);
    board.frame(0);
    expect(board.onCounts).toHaveBeenCalledTimes(2);
    expect(drawBoard).toHaveBeenCalledTimes(2);
    spy.mockReturnValueOnce({ ...shielded, elapsedMs: 100 });
    board.frame(100);
    expect(board.onCounts).toHaveBeenCalledTimes(2);
    expect(drawBoard).toHaveBeenCalledTimes(3);
    spy.mockReturnValueOnce({ ...shielded, elapsedMs: 650 });
    board.frame(650); // Final redraw removes the fading arc even without troops in flight.
    expect(drawBoard).toHaveBeenCalledTimes(4);
    spy.mockRestore();
    board.stop();
  });

  it('pauses the AI decision deadline while hidden and excludes background catch-up', () => {
    const board = harness(TERRITORIES, DEFAULT_AI);
    board.frame(0);
    board.frame(1700);
    expect(board.onCounts.mock.lastCall![0].transfers).toEqual([]);
    board.document.hidden = true;
    board.document.dispatchEvent(new Event('visibilitychange'));
    board.frame(60000);
    board.document.hidden = false;
    board.document.dispatchEvent(new Event('visibilitychange'));
    board.frame(61000);
    expect(board.onCounts.mock.lastCall![0].transfers).toEqual([]);
    board.frame(61150);
    const active: SimulationState = board.onCounts.mock.lastCall![0];
    expect(active.elapsedMs).toBe(1850);
    expect(active.transfers.some((t) => t.owner === 'enemy')).toBe(true);
    board.stop();
  });

  it('stops frames and rejects orders after victory, including on visibility resume', () => {
    const board = harness([
      { id: 'source', owner: 'player', units: 20, x: 0, y: 0 },
      { id: 'target', owner: 'enemy', units: 1, x: 100, y: 0 },
    ]);
    const [_, getTerritories, __, dispatch] = vi.mocked(bindDrag).mock.lastCall!;
    dispatch('source', 'target');
    board.frame(0);
    board.frame(Math.ceil(((100 - 2 * TERRITORY_RADIUS) / TRAVEL_SPEED) * 1000) + 100);
    const ended = board.onCounts.mock.lastCall![0];
    expect(ended.roundStatus).toBe('victory');
    expect(vi.mocked(bindDrag).mock.results.at(-1)!.value.cancel).toHaveBeenCalled();
    expect(board.onSnapshot).toHaveBeenLastCalledWith(ended, 'running', true);
    const requests = board.request.mock.calls.length;
    expect(getTerritories()).toEqual([]);
    dispatch('source', 'target');
    board.frame(10000);
    expect(board.onCounts.mock.lastCall![0]).toBe(ended);
    board.document.hidden = true;
    board.document.dispatchEvent(new Event('visibilitychange'));
    board.document.hidden = false;
    board.document.dispatchEvent(new Event('visibilitychange'));
    expect(board.request).toHaveBeenCalledTimes(requests);
    board.stop();
  });

  it('does not schedule frames for an already eliminated player', () => {
    const board = harness([{ id: 'enemy', owner: 'enemy', units: 10, x: 0, y: 0 }]);
    expect(board.onCounts.mock.lastCall![0].roundStatus).toBe('defeat');
    expect(board.request).not.toHaveBeenCalled();
    board.stop();
  });

  it('publishes and draws only whole-unit changes, not every frame', () => {
    const board = harness();
    expect(board.onCounts).toHaveBeenCalledTimes(1);
    board.frame(0);
    board.frame(500);
    expect(board.onCounts).toHaveBeenCalledTimes(1);
    expect(drawBoard).toHaveBeenCalledTimes(1);
    board.frame(1000);
    expect(board.onCounts).toHaveBeenCalledTimes(2);
    expect(drawBoard).toHaveBeenCalledTimes(2);
    expect(board.onCounts.mock.lastCall![0].territories[0].units).toBe(37);
    board.stop();
  });

  it('cancels frames on hide and cleans up observers and listeners on disposal', () => {
    const board = harness();
    board.frame(0);
    board.document.hidden = true;
    board.document.dispatchEvent(new Event('visibilitychange'));
    expect(board.cancel).toHaveBeenCalledTimes(1);
    const before = board.request.mock.calls.length;
    board.frame(60000);
    expect(board.request).toHaveBeenCalledTimes(before);
    board.stop();
    expect(board.disconnect).toHaveBeenCalledOnce();
    board.document.hidden = false;
    board.document.dispatchEvent(new Event('visibilitychange'));
    expect(board.request).toHaveBeenCalledTimes(before);
  });
});
