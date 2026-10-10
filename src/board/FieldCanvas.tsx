import { useRef } from 'react';
import { useBoardSession } from './useBoardSession';
import { PauseButton, SessionControls } from '../ui/SessionControls';
import { TroopCompositionBar } from '../ui/TroopCompositionBar';
import { TransferDetails } from './TransferDetails';
import { TERRITORIES } from './map';
import { TerritoryDetails } from './TerritoryDetails';
import { RoundResult } from '../ui/RoundResult';
import { RegionControls } from './RegionControls';
import type { RulesInput, SimulationState, Territory } from '../game/types';
import type { SessionPhase } from '../game/session';
import { DEFAULT_AI, type AiConfig } from '../game/ai/config';
import type { AiConfigurations } from '../game/ai/tick';
import type { River } from '../game/river';

interface FieldCanvasProps { territories?: readonly Territory[]; river?: River; rules?: RulesInput; ai?: AiConfig | AiConfigurations | null; autoStart?: boolean; onHome?: () => void; onNewMap?: () => void; initialState?: SimulationState; initialPhase?: Exclude<SessionPhase, 'ready'>; onSnapshot?: (state: SimulationState, phase: SessionPhase, force?: boolean) => void }

export function FieldCanvas({ territories = TERRITORIES, ai = DEFAULT_AI, autoStart = true, onHome, onNewMap, rules, river, initialState, initialPhase, onSnapshot }: FieldCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const session = useBoardSession(canvasRef, territories, ai, autoStart, rules, initialState, initialPhase, onSnapshot, river);
  const { state, phase } = session;

  return (
    <>
      <div className="mb-3 flex shrink-0 items-center gap-3">
        <div className="min-w-0 flex-1"><TroopCompositionBar state={state} /></div>
        {phase === 'running' && <PauseButton onPause={session.pause} />}
      </div>
      <div className="field-viewport relative min-h-0 flex-1">
        <canvas ref={canvasRef} tabIndex={-1} className="block h-full w-full touch-none rounded-[20px] bg-field select-none" role="img" aria-label="Territory board" aria-describedby={`territory-details upgrade-icon-help${state.river ? ' bridge-order-help' : ''}`}>
          Your browser does not support Canvas. Territory details are listed below.
        </canvas>
        <RegionControls state={state} disabled={phase !== 'running'} />
        {state.river && <p id="bridge-order-help" role="status" className="sr-only">
          {session.feedback || 'River crossings require paired bridge-city orders. Send within your bank, stage at a bridge city, then send across. The river itself is not a city target.'}
        </p>}
        {state.roundStatus === 'playing' && <SessionControls phase={phase}
          onResume={session.resume} onRestart={session.restart} onHome={onHome} onNewMap={onNewMap} />}
        <RoundResult status={state.roundStatus} onReplay={session.replay} onHome={onHome} onNewMap={onNewMap} />
      </div>
      <TerritoryDetails territories={state.territories} captureShields={state.captureShields} />
      <TransferDetails state={state} />
    </>
  );
}
