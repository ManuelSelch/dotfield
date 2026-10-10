import { createSession, type SessionPhase } from '../game/session';
import type { RulesInput, SimulationState, Territory } from '../game/types';
import type { AiConfigurations } from '../game/ai/tick';
import type { DragSelection } from './drag';
import { bindBoardInput } from './bindBoardInput';
import { drawBoard } from './drawBoard';
import { TERRITORIES } from './map';
import { DEFAULT_AI, type AiConfig } from '../game/ai/config';
import type { AiWorkerRequest, AiWorkerResponse } from '../game/ai/worker';

interface BoardOptions {
  autoStart?: boolean;
  onPhase?: (phase: SessionPhase) => void;
  onSnapshot?: (state: SimulationState, phase: SessionPhase, force?: boolean) => void;
  rules?: RulesInput;
  initialState?: SimulationState;
  initialPhase?: Exclude<SessionPhase, 'ready'>;
}

export function startBoard(canvas: HTMLCanvasElement, onState: (state: SimulationState) => void, territories: readonly Territory[] = TERRITORIES, ai: AiConfig | AiConfigurations | null = DEFAULT_AI, options: BoardOptions = {}) {
  const aiConfigs: Record<string, AiConfig> = {};
  if (ai && 'decisionIntervalMs' in ai) aiConfigs.enemy = ai as AiConfig;
  else if (ai) for (const [factionId, config] of Object.entries(ai)) {
    if (config) aiConfigs[factionId] = config;
  }
  const aiWorker = ai && typeof Worker !== 'undefined'
    ? new Worker(new URL('../game/ai/worker.ts', import.meta.url), { type: 'module' })
    : null;
  const session = createSession(territories, aiWorker ? null : ai, options.rules,
    { initialState: options.initialState, initialPhase: options.initialPhase });
  session.setHidden(document.hidden);
  if (options.autoStart !== false) session.start();
  let disposed = false;
  let state = session.state;
  let selection: DragSelection | null = null;
  let frameId = 0;
  let requestId = 0;
  const pendingAi = new Map<number, string>();
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
      redraw();
    });

  function requestAiDecisions() {
    if (!aiWorker || !session.active) return;
    for (const factionId of Object.keys(aiConfigs).sort()) {
      if ([...pendingAi.values()].includes(factionId)) continue;
      const config = aiConfigs[factionId];
      if (!config || !session.reserveAiDecision(factionId, config)) continue;
      const id = ++requestId;
      pendingAi.set(id, factionId);
      aiWorker.postMessage({ requestId: id, state: session.state, factionId, config } satisfies AiWorkerRequest);
    }
  }

  function frame(timestamp: number) {
    session.setHidden(document.hidden);
    if (disposed || !session.active) return;
    const previous = state;
    state = session.frame(timestamp);
    drag.validate();
    requestAiDecisions();
    const changed = state.territories.some((node, index) => node.units !== previous.territories[index].units || node.owner !== previous.territories[index].owner)
      || state.transfers.length !== previous.transfers.length || state.arrivals.length !== previous.arrivals.length
      || state.transfers.reduce((sum, t) => sum + t.units, 0) !== previous.transfers.reduce((sum, t) => sum + t.units, 0)
      || state.roundStatus !== previous.roundStatus;
    if (state.roundStatus !== 'playing') drag.cancel();
    if (changed) onState(state);
    if (state.roundStatus !== previous.roundStatus) options.onSnapshot?.(session.state, session.phase, true);
    if (changed || selection || state.transfers.length || previous.transfers.length) redraw();
    if (session.active) frameId = requestAnimationFrame(frame);
  }
  if (aiWorker) {
    aiWorker.onmessage = (event: MessageEvent<AiWorkerResponse>) => {
      const { requestId: id, factionId, order } = event.data;
      if (!pendingAi.delete(id) || disposed) return;
      if (order && session.active) {
        state = session.dispatchFaction(order.sourceId, order.targetId, factionId);
        drag.validate();
        onState(state);
        redraw();
      }
    };
    aiWorker.onerror = () => { /* The synchronous fallback remains available on the next session. */ };
  }

  function onVisibilityChange() {
    cancelAnimationFrame(frameId);
    drag.cancel();
    session.setHidden(document.hidden);
    options.onSnapshot?.(session.state, session.phase, true);
    if (session.active) frameId = requestAnimationFrame(frame);
  }
  function onPageHide() {
    drag.cancel();
    // Save the already-applied state; never advance the clock just to persist it.
    options.onSnapshot?.(session.state, session.phase, true);
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
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibilityChange);
  redraw();
  onState(state);
  options.onSnapshot?.(session.state, session.phase, true);
  options.onPhase?.(session.phase);
  if (session.active) frameId = requestAnimationFrame(frame);
  function command(action: 'start' | 'pause' | 'resume' | 'restart') {
    if (disposed) return;
    cancelAnimationFrame(frameId);
    drag.cancel(); session.setHidden(document.hidden); session[action]();
    pendingAi.clear();
    state = session.state; onState(state); options.onSnapshot?.(state, session.phase, true); options.onPhase?.(session.phase); redraw();
    if (session.active) frameId = requestAnimationFrame(frame);
  }
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    drag.dispose();
    observer.disconnect();
    window.removeEventListener('resize', redraw);
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    aiWorker?.terminate();
  };
  return Object.assign(dispose, {
    start: () => command('start'), pause: () => command('pause'),
    resume: () => command('resume'), restart: () => command('restart'),
  });
}
