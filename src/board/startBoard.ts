import { createClock } from '../game/clock';
import { advanceGrowth } from '../game/growth';
import { createSimulation } from '../game/state';
import type { Territory } from '../game/types';
import { drawBoard } from './drawBoard';
import { TERRITORIES } from './map';

// Browser adapter only: all growth and timing rules live in the game modules.
export function startBoard(canvas: HTMLCanvasElement, onCounts: (nodes: readonly Territory[]) => void) {
  let state = createSimulation(TERRITORIES);
  const clock = createClock();
  let frameId = 0;

  function redraw() {
    const bounds = canvas.getBoundingClientRect();
    drawBoard(canvas, state.territories, bounds.width, bounds.height, window.devicePixelRatio || 1);
  }

  function frame(timestamp: number) {
    if (document.hidden) return;
    const previous = state;
    // Growth can batch fixed steps exactly; no expensive catch-up tick loop.
    state = advanceGrowth(state, clock.advance(timestamp));
    if (state.territories.some((node, index) => node.units !== previous.territories[index].units)) {
      redraw();
      onCounts(state.territories);
    }
    frameId = requestAnimationFrame(frame);
  }

  function onVisibilityChange() {
    cancelAnimationFrame(frameId);
    clock.reset();
    if (!document.hidden) frameId = requestAnimationFrame(frame);
  }

  const observer = new ResizeObserver(redraw);
  observer.observe(canvas);
  window.addEventListener('resize', redraw);
  document.addEventListener('visibilitychange', onVisibilityChange);
  redraw();
  onCounts(state.territories);
  if (!document.hidden) frameId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(frameId);
    observer.disconnect();
    window.removeEventListener('resize', redraw);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
