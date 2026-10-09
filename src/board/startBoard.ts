import { createSession, type SessionPhase } from '../game/session';
import type { RulesInput, SimulationState, Territory } from '../game/types';
import type { AiConfigurations } from '../game/ai/tick';
import type { DragSelection } from './drag';
import { bindBoardInput } from './bindBoardInput';
import { drawBoard } from './drawBoard';
import { TERRITORIES } from './map';
import { DEFAULT_AI, type AiConfig } from '../game/ai/config';

interface BoardOptions {
  autoStart?: boolean;
  onPhase?: (phase: SessionPhase) => void;
  onSnapshot?: (state: SimulationState, phase: SessionPhase) => void;
  rules?: RulesInput;
  initialState?: SimulationState;
  initialPhase?: Exclude<SessionPhase, 'ready'>;
}

export function startBoard(canvas: HTMLCanvasElement, onState: (state: SimulationState) => void, territories: readonly Territory[] = TERRITORIES, ai: AiConfig | AiConfigurations | null = DEFAULT_AI, options: BoardOptions = {}) {
  const session = createSession(territories, ai, options.rules, { initialState: options.initialState, initialPhase: options.initialPhase });
  session.setHidden(document.hidden);
  if (options.autoStart !== false) session.start();
  let disposed = false;
  let state = session.state;
  let selection: DragSelection | null = null;
  let frameId = 0;
  function redraw() {
    const bounds = canvas.getBoundingClientRect();
    drawBoard(canvas, state, bounds.width, bounds.height, window.devicePixelRatio || 1, selection);
  }
  const drag = bindBoardInput(canvas, () => !disposed && session.active
    ? state.territories : [],
    (next) => { selection = next; redraw(); },
    (source, target) => {
      if (disposed) return;
      session.setHidden(document.hidden);
      const next = session.dispatch(source, target);
      if (next === state) return;
      state = next;
      onState(state);
      options.onSnapshot?.(state, session.phase);
      redraw();
    });

  function frame(timestamp: number) {
    session.setHidden(document.hidden);
    if (disposed || !session.active) return;
    const previous = state;
    state = session.frame(timestamp);
    const changed = state.territories.some((node, index) => node.units !== previous.territories[index].units || node.owner !== previous.territories[index].owner)
      || state.transfers.length !== previous.transfers.length || state.arrivals.length !== previous.arrivals.length
      || state.transfers.reduce((sum, t) => sum + t.units, 0) !== previous.transfers.reduce((sum, t) => sum + t.units, 0)
      || state.roundStatus !== previous.roundStatus;
    if (state.roundStatus !== 'playing') drag.cancel();
    if (changed) onState(state);
    options.onSnapshot?.(state, session.phase);
    if (changed || selection || state.transfers.length || previous.transfers.length) redraw();
    if (session.active) frameId = requestAnimationFrame(frame);
  }
  function onVisibilityChange() {
    cancelAnimationFrame(frameId);
    drag.cancel();
    session.setHidden(document.hidden);
    options.onSnapshot?.(state, session.phase);
    if (session.active) frameId = requestAnimationFrame(frame);
  }
  let bounds = canvas.getBoundingClientRect();
  const observer = new ResizeObserver(() => {
    const next = canvas.getBoundingClientRect();
    // ResizeObserver also fires after initial observe; preserve immediate first input.
    if (next.width !== bounds.width || next.height !== bounds.height) drag.cancel();
    bounds = next; redraw();
  });
  observer.observe(canvas);
  window.addEventListener('resize', redraw);
  document.addEventListener('visibilitychange', onVisibilityChange);
  redraw();
  onState(state);
  options.onSnapshot?.(state, session.phase);
  options.onPhase?.(session.phase);
  if (session.active) frameId = requestAnimationFrame(frame);
  function command(action: 'start' | 'pause' | 'resume' | 'restart') {
    if (disposed) return;
    cancelAnimationFrame(frameId);
    drag.cancel(); session.setHidden(document.hidden); session[action]();
    state = session.state; onState(state); options.onSnapshot?.(state, session.phase); options.onPhase?.(session.phase); redraw();
    if (session.active) frameId = requestAnimationFrame(frame);
  }
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    drag.dispose();
    observer.disconnect();
    window.removeEventListener('resize', redraw);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
  return Object.assign(dispose, {
    start: () => command('start'), pause: () => command('pause'),
    resume: () => command('resume'), restart: () => command('restart'),
  });
}
