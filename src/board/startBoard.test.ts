import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawBoard } from './drawBoard';
import { startBoard } from './startBoard';
import { bindDrag } from './bindDrag';
import { TERRITORIES } from './map';
import { DEFAULT_AI, type AiConfig } from '../game/ai/config';
import type { SimulationState } from '../game/types';
import * as roundRules from '../game/round';
import { createSnapshotSaver } from '../game/snapshotSaver';
import { TERRITORY_RADIUS, TRAVEL_SPEED } from '../game/settings';

vi.mock('./drawBoard', () => ({ drawBoard: vi.fn() }));
vi.mock('./bindDrag', () => ({ bindDrag: vi.fn(() => ({ cancel: vi.fn(), validate: vi.fn(), dispose: vi.fn() })) }));
vi.mock('./bindKeyboard', () => ({ bindKeyboard: vi.fn(() => ({ cancel: vi.fn(), validate: vi.fn(), dispose: vi.fn() })) }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

function harness(territories = TERRITORIES, ai: AiConfig | null = null, autoStart = true) {
  let callback = (_time: number) => {};
  const request = vi.fn((next: (time: number) => void) => { callback = next; return 1; });
  const cancel = vi.fn();
  const disconnect = vi.fn();
  const observe = vi.fn();
  const document = Object.assign(new EventTarget(), { hidden: false });
  const window = Object.assign(new EventTarget(), { devicePixelRatio: 1 });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', window);
  let onResize = () => {};
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { onResize = callback; } observe = observe; disconnect = disconnect; });
  let bounds = { width: 360, height: 480 };
  const canvas = { parentElement: new EventTarget(), getBoundingClientRect: () => bounds } as HTMLCanvasElement;
  const onCounts = vi.fn();
  const onSnapshot = vi.fn();
  const stop = startBoard(canvas, onCounts, territories, ai, { autoStart, onSnapshot });
  return { resize: (width = 360, height = 480) => { bounds = { width, height }; onResize(); }, frame: (time: number) => callback(time), document, window, request, cancel, disconnect, onCounts, onSnapshot, stop };
}

describe('board lifecycle adapter', () => {
  it('revalidates selection every frame and cancels on page exit', () => {
    const board = harness();
    const input = vi.mocked(bindDrag).mock.results.at(-1)!.value;
    board.frame(0); board.frame(100);
    expect(input.validate).toHaveBeenCalledTimes(2);
    board.window.dispatchEvent(new Event('pagehide'));
    expect(input.cancel).toHaveBeenCalledOnce();
    board.stop();
  });
  it('validates against newly captured or depleted source state, not the previous frame', () => {
    for (const [owner, units] of [['enemy', 36], ['player', 1]] as const) {
      const board = harness();
      const input = vi.mocked(bindDrag).mock.results.at(-1)!.value;
      const before: SimulationState = board.onCounts.mock.lastCall![0];
      const next = { ...before, territories: before.territories.map(node => node.id === 'south' ? { ...node, owner, units } : node) };
      input.validate.mockImplementation(() => {
        const nodes = vi.mocked(bindDrag).mock.lastCall![1]();
        expect(nodes.find(node => node.id === 'south')).toMatchObject({ owner, units });
      });
      const spy = vi.spyOn(roundRules, 'advanceRound').mockReturnValueOnce(next);
      board.frame(0); expect(input.validate).toHaveBeenCalledOnce();
      spy.mockRestore(); board.stop();
    }
  });
  it('forces latest snapshots on hide and page exit without advancing time', () => {
    const board = harness();
    board.frame(0); board.frame(100);
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
    board.frame(0); board.frame(100);
    vi.mocked(bindDrag).mock.lastCall![3]('south', 'centre');
    expect(write).not.toHaveBeenCalled();
    board.document.hidden = true;
    board.document.dispatchEvent(new Event('visibilitychange'));
    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.lastCall![0].transfers).toHaveLength(7);
    // Home clears storage and disposes this adapter; no delayed/event write may revive it.
    write.mockClear(); board.stop();
    board.window.dispatchEvent(new Event('pagehide'));
    board.document.dispatchEvent(new Event('visibilitychange'));
    board.frame(200);
    expect(write).not.toHaveBeenCalled();
  });

  it('forces phase changes but does not force every frame', () => {
    const board = harness();
    expect(board.onSnapshot).toHaveBeenLastCalledWith(expect.anything(), 'running', true);
    const snapshots = board.onSnapshot.mock.calls.length;
    board.frame(0); board.frame(1000);
    expect(board.onSnapshot).toHaveBeenCalledTimes(snapshots);
    board.stop.pause();
    expect(board.onSnapshot).toHaveBeenLastCalledWith(expect.anything(), 'paused', true);
    board.stop.resume();
    expect(board.onSnapshot).toHaveBeenLastCalledWith(expect.anything(), 'running', true);
    board.stop();
  });

  it('does not cancel first input on the initial same-size observer notification', () => {
    const board = harness();
    const input = vi.mocked(bindDrag).mock.results.at(-1)!.value;
    board.resize(); expect(input.cancel).not.toHaveBeenCalled();
    board.resize(320, 400); expect(input.cancel).toHaveBeenCalledOnce();
    board.resize(320, 400); expect(input.cancel).toHaveBeenCalledOnce();
    board.stop();
  });
  it('starts ready, pauses input and frames, restarts cleanly and ignores disposed commands', () => {
    const board = harness(TERRITORIES, null, false);
    const [_, getTerritories, __, dispatch] = vi.mocked(bindDrag).mock.lastCall!;
    expect(board.request).not.toHaveBeenCalled(); expect(getTerritories()).toEqual([]);
    board.stop.start(); board.frame(0); dispatch('south', 'centre'); board.frame(250);
    board.stop.pause(); const paused = board.onCounts.mock.lastCall![0];
    const requests = board.request.mock.calls.length;
    board.frame(60000); dispatch('south', 'north');
    board.document.hidden = true; board.document.dispatchEvent(new Event('visibilitychange'));
    board.document.hidden = false; board.document.dispatchEvent(new Event('visibilitychange'));
    expect(board.request).toHaveBeenCalledTimes(requests); expect(getTerritories()).toEqual([]);
    board.stop.resume(); board.frame(61000); board.frame(61100);
    board.stop.restart();
    expect(board.onCounts.mock.lastCall![0]).toMatchObject({ elapsedMs: 0, transfers: [], nextTransferId: 1 });
    expect(board.onCounts.mock.lastCall![0]).not.toBe(paused); expect(getTerritories()).toEqual([]);
    board.stop(); const stoppedRequests = board.request.mock.calls.length;
    board.stop.start(); board.stop.resume(); board.frame(100000);
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
    const after = { ...before, transfers: [{ ...before.transfers[0], units: 4, dotSlots: [0, 1, 3, 4] }] };
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
    const shielded = { ...before, captureShields: { south: { remaining: 2, blockedAt: 0, blockedFrom: 3 } } };
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
    spy.mockRestore(); board.stop();
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
    expect(active.transfers.some(t => t.owner === 'enemy')).toBe(true);
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
    board.frame(Math.ceil((100 - 2 * TERRITORY_RADIUS) / TRAVEL_SPEED * 1000) + 100);
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
