import { createSession } from '../game/session';
import type { SimulationState, Territory } from '../game/types';
import type { DragSelection } from './drag';
import { bindBoardInput } from './bindBoardInput';
import { drawBoard } from './drawBoard';
import { TERRITORIES } from './map';
import { DEFAULT_AI, type AiConfig } from '../game/ai/config';

export function startBoard(canvas: HTMLCanvasElement, onState: (state: SimulationState) => void, territories: readonly Territory[] = TERRITORIES, ai: AiConfig | null = DEFAULT_AI) {
  const session = createSession(territories, ai);
  session.setHidden(document.hidden);
  session.start(); // Preserve the current auto-start screen until visual controls are approved.
  let state = session.state;
  let selection: DragSelection | null = null;
  let frameId = 0;
  function redraw() {
    const bounds = canvas.getBoundingClientRect();
    drawBoard(canvas, state, bounds.width, bounds.height, window.devicePixelRatio || 1, selection);
  }
  const drag = bindBoardInput(canvas, () => session.active
    ? state.territories : [],
    (next) => { selection = next; redraw(); },
    (source, target) => {
      session.setHidden(document.hidden);
      const next = session.dispatch(source, target);
      if (next === state) return;
      state = next;
      onState(state);
      redraw();
    });

  function frame(timestamp: number) {
    session.setHidden(document.hidden);
    if (!session.active) return;
    const previous = state;
    state = session.frame(timestamp);
    const changed = state.territories.some((node, index) => node.units !== previous.territories[index].units || node.owner !== previous.territories[index].owner)
      || state.transfers.length !== previous.transfers.length || state.arrivals.length !== previous.arrivals.length
      || state.transfers.reduce((sum, t) => sum + t.units, 0) !== previous.transfers.reduce((sum, t) => sum + t.units, 0)
      || state.roundStatus !== previous.roundStatus;
    if (state.roundStatus !== 'playing') drag.cancel();
    if (changed) onState(state);
    if (changed || selection || state.transfers.length || previous.transfers.length) redraw();
    if (session.active) frameId = requestAnimationFrame(frame);
  }
  function onVisibilityChange() {
    cancelAnimationFrame(frameId);
    drag.cancel();
    session.setHidden(document.hidden);
    if (session.active) frameId = requestAnimationFrame(frame);
  }
  const observer = new ResizeObserver(() => { drag.cancel(); redraw(); });
  observer.observe(canvas);
  window.addEventListener('resize', redraw);
  document.addEventListener('visibilitychange', onVisibilityChange);
  redraw();
  onState(state);
  if (session.active) frameId = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(frameId);
    drag.dispose();
    observer.disconnect();
    window.removeEventListener('resize', redraw);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
