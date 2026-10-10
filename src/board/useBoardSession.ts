import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createSimulation } from '../game/state';
import type { SessionPhase } from '../game/session';
import type { SimulationState } from '../game/types';
import type { RulesInput, Territory } from '../game/types';
import type { AiConfig } from '../game/ai/config';
import type { AiConfigurations } from '../game/ai/tick';
import { startBoard } from './startBoard';
import type { River } from '../game/river';

export function useBoardSession(canvas: RefObject<HTMLCanvasElement | null>, territories: readonly Territory[], ai: AiConfig | AiConfigurations | null, autoStart: boolean, rules?: RulesInput, initialState?: SimulationState, initialPhase?: Exclude<SessionPhase, 'ready'>, onSnapshot?: (state: SimulationState, phase: SessionPhase, force?: boolean) => void, river?: River) {
  const controller = useRef<ReturnType<typeof startBoard> | null>(null);
  const [feedback, setFeedback] = useState('');
  const [state, setState] = useState(() => initialState ?? createSimulation(territories, rules, river));
  const [phase, setPhase] = useState<SessionPhase>(initialPhase ?? (autoStart ? 'running' : 'ready'));
  // Bind input before the freshly mounted field can receive its first key/tap.
  useLayoutEffect(() => {
    if (!canvas.current) return;
    const board = startBoard(canvas.current, setState, territories, ai, { autoStart, onPhase: setPhase, onFeedback: setFeedback, onSnapshot, rules, river, initialState, initialPhase });
    controller.current = board;
    return () => { controller.current = null; board(); };
  }, [canvas, territories, ai, autoStart, rules, initialState, initialPhase, onSnapshot, river]);
  function restart() {
    controller.current?.restart(); controller.current?.start(); canvas.current?.focus();
  }
  return { state, phase, feedback, restart, replay: restart,
    pause: () => controller.current?.pause(),
    resume() { controller.current?.resume(); canvas.current?.focus(); },
  };
}
