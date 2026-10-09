import { createClock } from '../game/clock';
import { advanceRound, evaluateRound } from '../game/round';
import { dispatchUnits } from '../game/dispatch';
import { createSimulation } from '../game/state';
import type { SimulationState, Territory } from '../game/types';
import type { DragSelection } from './drag';
import { bindDrag } from './bindDrag';
import { drawBoard } from './drawBoard';
import { TERRITORIES } from './map';

export function startBoard(canvas: HTMLCanvasElement, onState: (state: SimulationState) => void, territories: readonly Territory[] = TERRITORIES) {
  let state = evaluateRound(createSimulation(territories));
  let selection: DragSelection | null = null;
  const clock = createClock();
  let frameId = 0;
  function redraw() {
    const bounds = canvas.getBoundingClientRect();
    drawBoard(canvas, state, bounds.width, bounds.height, window.devicePixelRatio || 1, selection);
  }
  const drag = bindDrag(canvas, () => state.roundStatus === 'playing' ? state.territories : [],
    (next) => { selection = next; redraw(); },
    (source, target) => {
      if (document.hidden || state.roundStatus !== 'playing') return;
      const next = dispatchUnits(state, source, target);
      if (next === state) return;
      state = next;
      onState(state);
      redraw();
    });

  function frame(timestamp: number) {
    if (document.hidden || state.roundStatus !== 'playing') return;
    const previous = state;
    state = advanceRound(state, clock.advance(timestamp));
    const changed = state.territories.some((node, index) => node.units !== previous.territories[index].units || node.owner !== previous.territories[index].owner)
      || state.transfers.length !== previous.transfers.length || state.arrivals.length !== previous.arrivals.length
      || state.roundStatus !== previous.roundStatus;
    if (state.roundStatus !== 'playing') drag.cancel();
    if (changed) onState(state);
    if (changed || selection || state.transfers.length || previous.transfers.length) redraw();
    if (state.roundStatus === 'playing') frameId = requestAnimationFrame(frame);
  }
  function onVisibilityChange() {
    cancelAnimationFrame(frameId);
    drag.cancel();
    clock.reset();
    if (!document.hidden && state.roundStatus === 'playing') frameId = requestAnimationFrame(frame);
  }
  const observer = new ResizeObserver(() => { drag.cancel(); redraw(); });
  observer.observe(canvas);
  window.addEventListener('resize', redraw);
  document.addEventListener('visibilitychange', onVisibilityChange);
  redraw();
  onState(state);
  if (!document.hidden && state.roundStatus === 'playing') frameId = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(frameId);
    drag.dispose();
    observer.disconnect();
    window.removeEventListener('resize', redraw);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
