import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawBoard } from './drawBoard';
import { startBoard } from './startBoard';
import { bindDrag } from './bindDrag';
import { TERRITORIES } from './map';

vi.mock('./drawBoard', () => ({ drawBoard: vi.fn() }));
vi.mock('./bindDrag', () => ({ bindDrag: vi.fn(() => ({ cancel: vi.fn(), dispose: vi.fn() })) }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

function harness(territories = TERRITORIES) {
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
  vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect = disconnect; });
  const canvas = { getBoundingClientRect: () => ({ width: 360, height: 480 }) } as HTMLCanvasElement;
  const onCounts = vi.fn();
  const stop = startBoard(canvas, onCounts, territories);
  return { frame: (time: number) => callback(time), document, request, cancel, disconnect, onCounts, stop };
}

describe('board lifecycle adapter', () => {
  it('stops frames and rejects orders after victory, including on visibility resume', () => {
    const board = harness([
      { id: 'source', owner: 'player', units: 20, x: 0, y: 0 },
      { id: 'target', owner: 'enemy', units: 1, x: 100, y: 0 },
    ]);
    const [_, getTerritories, __, dispatch] = vi.mocked(bindDrag).mock.lastCall!;
    dispatch('source', 'target');
    board.frame(0);
    board.frame(1300);
    const ended = board.onCounts.mock.lastCall![0];
    expect(ended.roundStatus).toBe('victory');
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
