import { useEffect, useRef, useState, type RefObject } from 'react';
import { createSimulation } from '../game/state';
import type { SessionPhase } from '../game/session';
import type { Territory } from '../game/types';
import type { AiConfig } from '../game/ai/config';
import { startBoard } from './startBoard';

export function useBoardSession(canvas: RefObject<HTMLCanvasElement | null>, territories: readonly Territory[], ai: AiConfig | null, autoStart: boolean) {
  const controller = useRef<ReturnType<typeof startBoard> | null>(null);
  const [state, setState] = useState(() => createSimulation(territories));
  const [phase, setPhase] = useState<SessionPhase>(autoStart ? 'running' : 'ready');
  useEffect(() => {
    if (!canvas.current) return;
    const board = startBoard(canvas.current, setState, territories, ai, { autoStart, onPhase: setPhase });
    controller.current = board;
    return () => { controller.current = null; board(); };
  }, [canvas, territories, ai, autoStart]);
  function restart() {
    controller.current?.restart(); controller.current?.start(); canvas.current?.focus();
  }
  return { state, phase, restart, replay: restart,
    pause: () => controller.current?.pause(),
    resume() { controller.current?.resume(); canvas.current?.focus(); },
  };
}
