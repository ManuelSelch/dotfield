import { createSession, type SessionPhase } from '../game/session';
import type { CityType, RulesInput, SimulationState, Territory } from '../game/types';
import type { CityTargetMode } from './cityControlsModel';
import { screenPoint } from './layout';
import type { AiConfigurations } from '../game/ai/tick';
import type { DragSelection } from './drag';
import { bindBoardInput } from './bindBoardInput';
import { drawBoard } from './drawBoard';
import { hasShieldFlash } from './drawCaptureShields';
import { TERRITORIES } from './map';
import { DEFAULT_AI, type AiConfig } from '../game/ai/config';
import type { AiWorkerRequest, AiWorkerResponse } from '../game/ai/worker';
import { canRiverOrder, pairedCityId, type River } from '../game/river';
import type { Terrain } from '../game/terrain/types';
import { canDirectTerrainOrder } from '../game/terrain/directOrder';

export interface BoardCitySelection { cityId: string; targeting: CityTargetMode | null }
interface BoardOptions {
  onCitySelection?: (selection: BoardCitySelection | null) => void;
  autoStart?: boolean;
  onPhase?: (phase: SessionPhase) => void;
  onFeedback?: (message: string) => void;
  onSnapshot?: (state: SimulationState, phase: SessionPhase, force?: boolean) => void;
  rules?: RulesInput;
  river?: River;
  terrain?: Terrain;
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
    { initialState: options.initialState, initialPhase: options.initialPhase, river: options.river, terrain: options.terrain });
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
  }
  function openCity(cityId: string) {
    if (!session.active || !state.territories.some(c => c.id === cityId && c.owner === 'player')) return;
    citySelection = { cityId, targeting: null }; options.onCitySelection?.(citySelection);
  }
  let frameId = 0;
  let requestId = 0;
  const pendingAi = new Map<number, string>();
  function redraw() {
    const bounds = canvas.getBoundingClientRect();
    drawBoard(canvas, state, bounds.width, bounds.height, window.devicePixelRatio || 1, selection);
  }
  const drag = bindBoardInput(canvas, () => !disposed && session.active
    ? state.territories : [],
    (next) => {
      selection = next;
      const source = state.territories.find(c => c.id === next?.sourceId);
      const target = state.territories.find(c => c.id === next?.targetId);
      const pair = source && pairedCityId(source.id, state.river);
      options.onFeedback?.(source && target && source.id !== target.id && !canDirectTerrainOrder(source, target, state.terrain)
        ? 'Mountains block direct orders. Stage troops around the ridge.' : state.river && source ? target && !canRiverOrder(source, target, state.river)
        ? 'Cross only between the paired bridge cities.'
        : pair ? `Cross to ${pair}, or send within this bank.` : 'Send within this bank; stage troops at a bridge city.' : '');
      redraw();
    },
    (source, target) => {
      if (disposed) return;
      session.setHidden(document.hidden);
      const next = session.dispatch(source, target);
      if (next === state) {
        const from = state.territories.find(c => c.id === source), to = state.territories.find(c => c.id === target);
        if (from && to && !canRiverOrder(from, to, state.river)) options.onFeedback?.('Cross only between the paired bridge cities.');
        else if (from && to && !canDirectTerrainOrder(from, to, state.terrain)) options.onFeedback?.('Mountains block direct orders. Stage troops around the ridge.');
        return;
      }
      state = next;
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
        if (next === state) { options.onFeedback?.('Order unavailable. Choose another target or cancel.'); return; }
        state = next; citySelection = { cityId: source.id, targeting: null };
        options.onCitySelection?.(citySelection); onState(state); focusCity(); redraw();
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
    drag.cancel();
    if (citySelection) { citySelection = { ...citySelection, targeting: null }; options.onCitySelection?.(citySelection); focusCity(); }
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
    const changed = state.territories.some((node, index) => node.units !== previous.territories[index].units || node.owner !== previous.territories[index].owner || node.cityType !== previous.territories[index].cityType)
      || state.transfers.length !== previous.transfers.length || state.arrivals.length !== previous.arrivals.length
      || state.transfers.reduce((sum, t) => sum + t.units, 0) !== previous.transfers.reduce((sum, t) => sum + t.units, 0)
      || state.captureShields !== previous.captureShields
      || Object.keys(state.aircraft ?? {}).length !== Object.keys(previous.aircraft ?? {}).length
      || Object.values(state.aircraft ?? {}).some(p => {
        const old = previous.aircraft?.[p.homeId];
        return !old || old.phase !== p.phase || old.cargo !== p.cargo || old.owner !== p.owner || old.tripId !== p.tripId;
      })
      || state.roundStatus !== previous.roundStatus;
    if (citySelection && !managedCity()) clearCity();
    if (state.roundStatus !== 'playing') { drag.cancel(); clearCity(); }
    if (changed) onState(state);
    if (state.roundStatus !== previous.roundStatus) options.onSnapshot?.(session.state, session.phase, true);
    if (changed || selection || state.transfers.length || previous.transfers.length
      || hasShieldFlash(state) || hasShieldFlash(previous)
      || Object.values(state.aircraft ?? {}).some(p => ['outbound', 'unloading', 'returning'].includes(p.phase))
      || Object.values(previous.aircraft ?? {}).some(p => ['outbound', 'unloading', 'returning'].includes(p.phase))
      || (state.airDeliveries?.length ?? 0) > 0 || (previous.airDeliveries?.length ?? 0) > 0) redraw();
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
    drag.cancel(); clearCity();
    session.setHidden(document.hidden);
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
  if (session.active) frameId = requestAnimationFrame(frame);
  function command(action: 'start' | 'pause' | 'resume' | 'restart') {
    if (disposed) return;
    cancelAnimationFrame(frameId);
    drag.cancel(); clearCity(); session.setHidden(document.hidden); session[action]();
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
      if (next !== state) { state = next; drag.cancel(); onState(state); focusCity(); redraw(); }
    },
    target, cancelTarget,
    closeCity() { clearCity(true); drag.cancel(); },
    start: () => command('start'), pause: () => command('pause'),
    resume: () => command('resume'), restart: () => command('restart'),
  });
}
