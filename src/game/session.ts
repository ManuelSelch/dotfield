import { DEFAULT_AI, type AiConfig } from './ai/config';
import { createClock } from './clock';
import { dispatchUnits } from './dispatch';
import { advanceRound, evaluateRound } from './round';
import { createSimulation } from './state';
import type { GrowthRules, Territory } from './types';

export type SessionPhase = 'ready' | 'running' | 'paused';

// UI-independent lifecycle. Round outcomes remain separate from user pause/start state.
export function createSession(territories: readonly Territory[], ai: AiConfig | null = DEFAULT_AI, rules?: GrowthRules) {
  const opening = territories.map(n => ({ ...n }));
  const growth = rules ? { ...rules } : undefined;
  const policy = ai ? { ...ai } : null;
  let state = evaluateRound(createSimulation(opening, growth));
  let phase: SessionPhase = 'ready';
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
      state = evaluateRound(createSimulation(opening, growth));
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
  };
}
