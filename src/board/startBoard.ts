import { createSession, type SessionPhase } from '../game/session';
import type { CityType, RulesInput, SimulationState, Territory } from '../game/types';
import type { CityTargetMode } from './cityControlsModel';
import type { CityInputOptions } from './cityInputOptions';
import { screenPoint } from './layout';
import type { AiConfigurations } from '../game/ai/tick';
import type { DragSelection } from './drag';
import { bindBoardInput } from './bindBoardInput';
import { drawBoard } from './drawBoard';
import { hasShieldFlash } from './drawCaptureShields';
import { hasAircraftAnimation } from './drawAircraft';
import { TERRITORIES } from './map';
import { DEFAULT_AI, type AiConfig } from '../game/ai/config';
import type { AiWorkerRequest, AiWorkerResponse } from '../game/ai/worker';
import { recordDecision, type AiActivity, type RecordedAiDecision } from './enemyDashboard';
import { factionArmyUnits } from '../game/ai/logistics';
import { pairedCityId, type River } from '../game/river';
import type { Terrain } from '../game/terrain/types';
import { groundOrderFeedback } from './groundOrderFeedback';

export interface BoardCitySelection { cityId: string; targeting: CityTargetMode | null }
interface BoardOptions {
  onCitySelection?: (selection: BoardCitySelection | null) => void;
  autoStart?: boolean;
  onPhase?: (phase: SessionPhase) => void;
  onFeedback?: (message: string) => void;
  onSnapshot?: (state: SimulationState, phase: SessionPhase, force?: boolean) => void;
  onAiDecision?: (decision: RecordedAiDecision) => void;
  onAiActivity?: (activity: Readonly<Record<string, AiActivity>>) => void;
  rules?: RulesInput;
  river?: River;
  terrain?: Terrain;
  relay?: import('../game/relay').RelayDefinition;
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
    { initialState: options.initialState, initialPhase: options.initialPhase, river: options.river, terrain: options.terrain, relay: options.relay });
  session.setHidden(document.hidden);
  if (options.autoStart !== false) session.start();
  let disposed = false;
  let state = session.state;
  let selection: DragSelection | null = null;
  let citySelection: BoardCitySelection | null = null;
  function managedCity() {
    return state.territories.find(c => c.id === citySelection?.cityId && c.owner === 'player');
  }
  function focusCity() {
    const buttons = canvas.parentElement?.querySelectorAll?.<HTMLButtonElement>('button[data-city-id]');
    const button = buttons && [...buttons].find(b => b.dataset.cityId === citySelection?.cityId);
    if (button) button.focus(); else canvas.focus?.();
  }
  function clearCity(restoreFocus = false) {
    if (restoreFocus) focusCity();
    if (!citySelection) return;
    citySelection = null; options.onCitySelection?.(null);
    // React removes the management bar after this event. Repaint at the restored
    // size even if focus forced an interim layout before ResizeObserver delivery.
    queueMicrotask(() => { if (!disposed) redraw(); });
  }
  function openCity(cityId: string, origin?: Parameters<NonNullable<CityInputOptions['onOwnedCityTap']>>[1]) {
    if (!session.active || !state.territories.some(c => c.id === cityId && c.owner === 'player')) return;
    if ((origin === 'touch' || origin === 'pen') && citySelection?.cityId === cityId && !citySelection.targeting) { clearCity(); return; }
    citySelection = { cityId, targeting: null }; options.onCitySelection?.(citySelection);
  }
  let frameId = 0;
  let requestId = 0;
  const pendingAi = new Map<number, { factionId: string; decisionState: SimulationState; sentAtMs: number; evaluation: number }>();
  const evaluations = new Map<string, number>();
  const decisions = new Map<string, RecordedAiDecision>();
  let workerError = false;
  let lastActivityAt = -Infinity;
  function publishAiActivity(force = false) {
    const nowMs = performance.now();
    if (!force && nowMs - lastActivityAt < 250) return;
    lastActivityAt = nowMs;
    const current = session.state;
    options.onAiActivity?.(Object.fromEntries(Object.entries(aiConfigs).map(([factionId, config]) => {
      const pending = [...pendingAi.values()].find(p => p.factionId === factionId);
      return [factionId, {
        elapsedMs: current.elapsedMs, nowMs, phase: session.phase, hidden: document.hidden,
        playing: current.roundStatus === 'playing', workerAvailable: !!aiWorker,
        alive: current.territories.some(c => c.owner === factionId) || factionArmyUnits(current, factionId) > 0,
        nextDecisionMs: current.aiDecisionDeadlines[factionId] ?? config.initialDelayMs,
        pendingSinceMs: pending?.sentAtMs, error: workerError,
      } satisfies AiActivity];
    })));
  }
  function redraw() {
    const bounds = canvas.getBoundingClientRect();
    drawBoard(canvas, state, bounds.width, bounds.height, window.devicePixelRatio || 1, selection, citySelection?.targeting === 'fly');
  }
  const drag = bindBoardInput(canvas, () => !disposed && session.active
    ? state.territories : [],
    (next) => {
      selection = next;
      const source = state.territories.find(c => c.id === next?.sourceId);
      const target = state.territories.find(c => c.id === next?.targetId);
      const pair = source && pairedCityId(source.id, state.river);
      // Keyboard restores target focus after dispatch. Do not erase a rejected
      // command's explanation with that focus-only notification.
      if (source || !next) options.onFeedback?.(citySelection?.targeting === 'fly' ? '' : groundOrderFeedback(state, source, target)
        ?? (state.river && source ? pair ? `Cross to ${pair}, or send within this bank.`
          : 'Send within this bank; stage troops at a bridge city.' : ''));
      redraw();
    },
    (source, target) => {
      if (disposed) return;
      session.setHidden(document.hidden);
      const next = session.dispatch(source, target);
      if (next === state) {
        const from = state.territories.find(c => c.id === source), to = state.territories.find(c => c.id === target);
        const feedback = groundOrderFeedback(state, from, to);
        if (feedback) options.onFeedback?.(feedback);
        return;
      }
      state = next;
      clearCity();
      onState(state);
      redraw();
    }, () => state.river, {
      onOwnedCityTap: openCity,
      onOutsideTap: () => { clearCity(); },
      getTargetMode: () => citySelection?.targeting ?? null,
      onTargetTap(targetId, mode) {
        const source = managedCity();
        if (!source || source.id === targetId || !session.active) return;
        session.setHidden(document.hidden);
        const next = mode === 'fly' ? session.fly(source.id, targetId) : session.dispatch(source.id, targetId);
        if (next === state) {
          const destination = state.territories.find(c => c.id === targetId);
          options.onFeedback?.((mode === 'ground' ? groundOrderFeedback(state, source, destination) : null)
            ?? 'Order unavailable. Choose another target or cancel.'); return;
        }
        state = next; citySelection = { cityId: source.id, targeting: null };
        options.onCitySelection?.(citySelection); onState(state); options.onSnapshot?.(state, session.phase, true); focusCity(); redraw();
      },
    });
  function target(mode: CityTargetMode) {
    if (disposed) return;
    session.setHidden(document.hidden);
    const city = managedCity();
    if (!session.active || !city || city.units < 2
      || (mode === 'fly' && state.aircraft?.[city.id]?.phase !== 'ready')) return;
    drag.cancel();
    citySelection = { cityId: city.id, targeting: mode }; options.onCitySelection?.(citySelection);
    const bounds = canvas.getBoundingClientRect();
    selection = { sourceId: city.id, targetId: null, point: screenPoint(city, bounds.width, bounds.height) };
    redraw();
  }
  function cancelTarget() {
    if (citySelection) { citySelection = { ...citySelection, targeting: null }; options.onCitySelection?.(citySelection); focusCity(); }
    // Restoring DOM focus can create a keyboard highlight; clear it afterwards.
    drag.cancel();
  }
  function onCityKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && citySelection) {
      event.preventDefault();
      if (citySelection.targeting) cancelTarget(); else { clearCity(true); drag.cancel(); }
    }
  }
  function outsideCity(event: PointerEvent) {
    const element = event.target as Element | null;
    if (element !== canvas && !element?.closest?.('.city-controls')) clearCity();
  }
  document.addEventListener('keydown', onCityKey);
  document.addEventListener('pointerdown', outsideCity);

  function requestAiDecisions() {
    if (!aiWorker || !session.active) return;
    for (const factionId of Object.keys(aiConfigs).sort()) {
      if ([...pendingAi.values()].some(pending => pending.factionId === factionId)) continue;
      const config = aiConfigs[factionId];
      if (!config || !session.reserveAiDecision(factionId, config)) continue;
      const id = ++requestId;
      const decisionState = session.state;
      const evaluation = (evaluations.get(factionId) ?? 0) + 1;
      evaluations.set(factionId, evaluation);
      pendingAi.set(id, { factionId, decisionState, sentAtMs: performance.now(), evaluation });
      publishAiActivity(true);
      try {
        aiWorker.postMessage({ requestId: id, state: decisionState, factionId, config } satisfies AiWorkerRequest);
      } catch {
        workerError = true;
        publishAiActivity(true);
      }
    }
  }

  function frame(timestamp: number) {
    session.setHidden(document.hidden);
    if (disposed || !session.active) return;
    const previous = state;
    state = session.frame(timestamp);
    drag.validate();
    requestAiDecisions();
    publishAiActivity(state.roundStatus !== previous.roundStatus);
    const changed = state.territories.some((node, index) => node.units !== previous.territories[index].units || node.owner !== previous.territories[index].owner || node.cityType !== previous.territories[index].cityType)
      || state.transfers.length !== previous.transfers.length || state.arrivals.length !== previous.arrivals.length
      || state.transfers.reduce((sum, t) => sum + t.units, 0) !== previous.transfers.reduce((sum, t) => sum + t.units, 0)
      || state.captureShields !== previous.captureShields
      || Object.keys(state.aircraft ?? {}).length !== Object.keys(previous.aircraft ?? {}).length
      || Object.values(state.aircraft ?? {}).some(p => {
        const old = previous.aircraft?.[p.homeId];
        return !old || old.phase !== p.phase || old.cargo !== p.cargo || old.owner !== p.owner || old.tripId !== p.tripId
          || (['preparing', 'turnaround'].includes(p.phase)
            && Math.ceil((p.durationMs - p.elapsedMs) / 1000) !== Math.ceil((old.durationMs - old.elapsedMs) / 1000));
      })
      || state.roundStatus !== previous.roundStatus
      || !!state.relay && (Math.floor(state.elapsedMs / 1000) !== Math.floor(previous.elapsedMs / 1000)
        || Object.entries(state.relay.scoresMs).some(([id, score]) => Math.floor(score / 1000) !== Math.floor((previous.relay?.scoresMs[id] ?? 0) / 1000)));
    if (citySelection && !managedCity()) clearCity();
    if (state.roundStatus !== 'playing') { drag.cancel(); clearCity(); }
    if (changed) onState(state);
    if (state.roundStatus !== previous.roundStatus) options.onSnapshot?.(session.state, session.phase, true);
    if (changed || selection || state.transfers.length || previous.transfers.length
      || hasShieldFlash(state) || hasShieldFlash(previous)
      || hasAircraftAnimation(state) || hasAircraftAnimation(previous)) redraw();
    if (session.active) frameId = requestAnimationFrame(frame);
  }
  if (aiWorker) {
    aiWorker.onmessage = (event: MessageEvent<AiWorkerResponse>) => {
      const { requestId: id, factionId, action, trace } = event.data;
      const pending = pendingAi.get(id);
      if (pending?.factionId !== factionId || !pendingAi.delete(id) || disposed) return;
      session.setHidden(document.hidden);
      let outcome: RecordedAiDecision['outcome'] = action ? 'inactive' : 'no-command';
      if (action && session.active) {
        const before = session.state;
        state = session.applyFactionAction(action, factionId);
        outcome = state === before ? 'rejected' : 'applied';
        drag.validate();
        if (citySelection && !managedCity()) clearCity();
        onState(state);
        options.onSnapshot?.(state, session.phase, true);
        redraw();
      }
      const decision = recordDecision(pending.decisionState, factionId, action, trace, {
        completedAtMs: session.state.elapsedMs, evaluation: pending.evaluation, outcome,
      }, decisions.get(factionId));
      decisions.set(factionId, decision);
      options.onAiDecision?.(decision);
      publishAiActivity(true);
    };
    const reportWorkerError = () => { if (!disposed) { workerError = true; publishAiActivity(true); } };
    aiWorker.onerror = reportWorkerError;
    aiWorker.onmessageerror = reportWorkerError;
  }

  function onVisibilityChange() {
    cancelAnimationFrame(frameId);
    drag.cancel(); clearCity();
    session.setHidden(document.hidden);
    publishAiActivity(true);
    options.onSnapshot?.(session.state, session.phase, true);
    if (session.active) frameId = requestAnimationFrame(frame);
  }
  function onPageHide() {
    drag.cancel(); clearCity();
    // Save the already-applied state; never advance the clock just to persist it.
    options.onSnapshot?.(session.state, session.phase, true);
  }
  let bounds = canvas.getBoundingClientRect();
  const observer = new ResizeObserver(() => {
    const next = canvas.getBoundingClientRect();
    // ResizeObserver also fires after initial observe; preserve immediate first input.
    if ((next.width !== bounds.width || next.height !== bounds.height) && !citySelection) drag.cancel();
    bounds = next; redraw();
  });
  observer.observe(canvas);
  function onWindowResize() { drag.cancel(); redraw(); }
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibilityChange);
  redraw();
  onState(state);
  options.onSnapshot?.(session.state, session.phase, true);
  options.onPhase?.(session.phase);
  publishAiActivity(true);
  if (session.active) frameId = requestAnimationFrame(frame);
  function command(action: 'start' | 'pause' | 'resume' | 'restart') {
    if (disposed) return;
    cancelAnimationFrame(frameId);
    drag.cancel(); clearCity(); session.setHidden(document.hidden); session[action]();
    if (action === 'restart') { pendingAi.clear(); evaluations.clear(); decisions.clear(); }
    state = session.state; onState(state); options.onSnapshot?.(state, session.phase, true); options.onPhase?.(session.phase); redraw();
    publishAiActivity(true);
    if (session.active) frameId = requestAnimationFrame(frame);
  }
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    drag.dispose();
    observer.disconnect();
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.removeEventListener('keydown', onCityKey);
    document.removeEventListener('pointerdown', outsideCity);
    aiWorker?.terminate();
  };
  return Object.assign(dispose, {
    convert(type: CityType) {
      if (disposed || !managedCity() || citySelection?.targeting) return;
      session.setHidden(document.hidden);
      const next = session.convert(citySelection!.cityId, type);
      if (next !== state) { state = next; drag.cancel(); onState(state); options.onSnapshot?.(state, session.phase, true); focusCity(); redraw(); }
    },
    target, cancelTarget,
    closeCity() { clearCity(true); drag.cancel(); },
    start: () => command('start'), pause: () => command('pause'),
    resume: () => command('resume'), restart: () => command('restart'),
  });
}
