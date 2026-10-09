import { DEFAULT_AI, type AiConfig } from './ai/config';
import { createClock } from './clock';
import { dispatchUnits } from './dispatch';
import { advanceRound, evaluateRound } from './round';
import { createSimulation } from './state';
import type { FactionId, RulesInput, Territory } from './types';
import type { AiConfigurations } from './ai/tick';
import { createRules } from './rules';
import { snapshotTerritories } from './features/snapshot';
import type { SimulationState } from './types';

export type SessionPhase = 'ready' | 'running' | 'paused';

interface SessionOptions { initialState?: SimulationState; initialPhase?: Exclude<SessionPhase, 'ready'> }

// UI-independent lifecycle. Round outcomes remain separate from user pause/start state.
export function createSession(territories: readonly Territory[], ai: AiConfig | AiConfigurations | null = DEFAULT_AI, rules?: RulesInput, options: SessionOptions = {}) {
  const opening = snapshotTerritories(territories);
  const resolvedRules = createRules(rules);
  const policy = ai ? ('decisionIntervalMs' in ai ? { ...ai } : Object.fromEntries(Object.entries(ai).map(([id, config]) => [id, config && { ...config }])) as Partial<Record<FactionId, AiConfig>>) : null;
  let state = options.initialState ?? evaluateRound(createSimulation(opening, resolvedRules));
  let phase: SessionPhase = options.initialState ? (options.initialPhase ?? 'paused') : 'ready';
  let hidden = false;
  let clock = createClock();
  const active = () => phase === 'running' && !hidden && state.roundStatus === 'playing';
  return {
    get state() { return state; },
    get phase() { return phase; },
    get active() { return active(); },
    start() {
      if (phase !== 'ready' || state.roundStatus !== 'playing') return;
      phase = 'running'; clock.reset();
    },
    pause() {
      if (phase !== 'running' || state.roundStatus !== 'playing') return;
      phase = 'paused'; clock.reset();
    },
    resume() {
      if (phase !== 'paused' || state.roundStatus !== 'playing') return;
      phase = 'running'; clock.reset();
    },
    setHidden(value: boolean) {
      if (hidden === value) return;
      hidden = value; clock.reset();
    },
    restart() {
      state = evaluateRound(createSimulation(opening, resolvedRules));
      phase = 'ready'; clock = createClock();
    },
    frame(timestampMs: number) {
      if (active()) state = advanceRound(state, clock.advance(timestampMs), policy);
      return state;
    },
    dispatch(sourceId: string, targetId: string) {
      if (active()) state = dispatchUnits(state, sourceId, targetId);
      return state;
    },
    reserveAiDecision(factionId: FactionId, config: AiConfig) {
      if (!active()) return false;
      const deadline = state.aiDecisionDeadlines[factionId] ?? config.initialDelayMs;
      if (state.elapsedMs < deadline) return false;
      const nextDeadline = state.elapsedMs + config.decisionIntervalMs;
      state = { ...state,
        aiDecisionDeadlines: { ...state.aiDecisionDeadlines, [factionId]: nextDeadline },
        ...(factionId === 'enemy' ? { aiNextDecisionMs: nextDeadline } : {}),
      };
      return true;
    },
    dispatchFaction(sourceId: string, targetId: string, factionId: FactionId) {
      if (active()) state = dispatchUnits(state, sourceId, targetId, factionId);
      return state;
    },
  };
}
