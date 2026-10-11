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
import type { Terrain } from '../game/terrain/types';

interface FieldCanvasProps { territories?: readonly Territory[]; river?: River; terrain?: Terrain; rules?: RulesInput; ai?: AiConfig | AiConfigurations | null; autoStart?: boolean; onHome?: () => void; onNewMap?: () => void; initialState?: SimulationState; initialPhase?: Exclude<SessionPhase, 'ready'>; onSnapshot?: (state: SimulationState, phase: SessionPhase, force?: boolean) => void }

export function FieldCanvas({ territories = TERRITORIES, ai = DEFAULT_AI, autoStart = true, onHome, onNewMap, rules, river, terrain, initialState, initialPhase, onSnapshot }: FieldCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const session = useBoardSession(canvasRef, territories, ai, autoStart, rules, initialState, initialPhase, onSnapshot, river, terrain);
  const { state, phase } = session;

  return (
    <>
      <div className="mb-3 flex shrink-0 items-center gap-3">
        <div className="min-w-0 flex-1"><TroopCompositionBar state={state} /></div>
        {phase === 'running' && <PauseButton onPause={session.pause} />}
      </div>
      <div className="field-viewport relative min-h-0 flex-1">
        <canvas ref={canvasRef} tabIndex={-1} className="block h-full w-full touch-none rounded-[20px] bg-field select-none" role="img" aria-label="Territory board" aria-describedby={`territory-details upgrade-icon-help${state.river ? ' bridge-order-help' : ''}${state.terrain ? ' terrain-order-help' : ''}`}>
          Your browser does not support Canvas. Territory details are listed below.
        </canvas>
        <RegionControls state={state} disabled={phase !== 'running'} />
        {state.river && <p id="bridge-order-help" role="status" className="sr-only">
          {session.feedback || 'River crossings require paired bridge-city orders. Send within your bank, stage at a bridge city, then send across. The river itself is not a city target.'}
        </p>}
        {state.territories.some(c => c.features?.some(f => f.kind === 'artillery')) && <p role="status" aria-label="Artillery feedback" className="sr-only">
          {state.artilleryShots?.length ? state.artilleryShots.map(shot => `${shot.sourceId} fired at ${shot.targetId}: one defender lost.`).join(' ') : 'Artillery automatically fires at hostile garrisons; neutral Artillery is inactive.'}
        </p>}
        {state.terrain && <p id="terrain-order-help" role="status" className="sr-only">
          {session.feedback || 'Mountains block direct troop orders and Artillery shots. Stage troops around the ridge; Artillery automatically targets the nearest hostile garrison within its range.'}
        </p>}
        {state.roundStatus === 'playing' && <SessionControls phase={phase}
          onResume={session.resume} onRestart={session.restart} onHome={onHome} />}
        <RoundResult status={state.roundStatus} onReplay={session.replay} onHome={onHome} onNewMap={onNewMap} />
      </div>
      <TerritoryDetails territories={state.territories} captureShields={state.captureShields} />
      <TransferDetails state={state} />
    </>
  );
}
