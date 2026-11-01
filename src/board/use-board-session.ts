import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

import type { AiConfig } from '@/game/ai/config';
import type { AiConfigurations } from '@/game/ai/tick';
import type { River } from '@/game/river';
import type { SessionPhase } from '@/game/session';
import { createSimulation } from '@/game/state';
import type { Terrain } from '@/game/terrain/types';
import type { CityType } from '@/game/types';
import type { RulesInput, Territory } from '@/game/types';
import type { SimulationState } from '@/game/types';

import type { CityTargetMode } from './city-controls-model';
import type { AiActivity, RecordedAiDecision } from './enemy-dashboard';
import { startBoard, type BoardCitySelection } from './start-board';

export function useBoardSession(
  canvas: RefObject<HTMLCanvasElement | null>,
  territories: readonly Territory[],
  ai: AiConfig | AiConfigurations | null,
  autoStart: boolean,
  rules?: RulesInput,
  initialState?: SimulationState,
  initialPhase?: Exclude<SessionPhase, 'ready'>,
  onSnapshot?: (state: SimulationState, phase: SessionPhase, force?: boolean) => void,
  river?: River,
  terrain?: Terrain,
  relay?: import('@/game/relay').RelayDefinition,
) {
  const controller = useRef<ReturnType<typeof startBoard> | null>(null);
  const [feedback, setFeedback] = useState('');
  const [citySelection, setCitySelection] = useState<BoardCitySelection | null>(null);
  const [aiDecisions, setAiDecisions] = useState<Readonly<Record<string, RecordedAiDecision>>>({});
  const [aiActivity, setAiActivity] = useState<Readonly<Record<string, AiActivity>>>({});
  const [state, setState] = useState(
    () => initialState ?? createSimulation(territories, rules, river, terrain, relay),
  );
  const [phase, setPhase] = useState<SessionPhase>(
    initialPhase ?? (autoStart ? 'running' : 'ready'),
  );
  // Bind input before the freshly mounted field can receive its first key/tap.
  useLayoutEffect(() => {
    if (!canvas.current) return;
    setAiDecisions({});
    setAiActivity({});
    const board = startBoard(canvas.current, setState, territories, ai, {
      autoStart,
      onCitySelection: setCitySelection,
      onPhase: setPhase,
      onFeedback: setFeedback,
      onSnapshot,
      onAiDecision: (decision) =>
        setAiDecisions((current) => ({ ...current, [decision.factionId]: decision })),
      onAiActivity: setAiActivity,
      rules,
      river,
      terrain,
      relay,
      initialState,
      initialPhase,
    });
    controller.current = board;
    return () => {
      controller.current = null;
      board();
    };
  }, [
    canvas,
    territories,
    ai,
    autoStart,
    rules,
    initialState,
    initialPhase,
    onSnapshot,
    river,
    terrain,
    relay,
  ]);
  function restart() {
    setAiDecisions({});
    controller.current?.restart();
    controller.current?.start();
    canvas.current?.focus();
  }
  return {
    state,
    phase,
    feedback,
    citySelection,
    aiDecisions,
    aiActivity,
    restart,
    replay: restart,
    convert: (type: CityType) => controller.current?.convert(type),
    target: (mode: CityTargetMode) => controller.current?.target(mode),
    cancelTarget: () => controller.current?.cancelTarget(),
    closeCity: () => controller.current?.closeCity(),
    pause: () => controller.current?.pause(),
    resume() {
      controller.current?.resume();
      canvas.current?.focus();
    },
  };
}
