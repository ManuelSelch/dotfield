import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawBoard } from './drawBoard';
import { startBoard } from './startBoard';

vi.mock('./drawBoard', () => ({ drawBoard: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

function harness() {
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
  const stop = startBoard(canvas, onCounts);
  return { frame: (time: number) => callback(time), document, request, cancel, disconnect, onCounts, stop };
}

describe('board lifecycle adapter', () => {
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
    expect(board.onCounts.mock.lastCall![0][0].units).toBe(37);
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
