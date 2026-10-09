import { useRef } from 'react';
import { useBoardSession } from './useBoardSession';
import { PauseButton, SessionControls } from '../ui/SessionControls';
import { TroopCompositionBar } from '../ui/TroopCompositionBar';
import { TransferDetails } from './TransferDetails';
import { TERRITORIES } from './map';
import { TerritoryDetails } from './TerritoryDetails';
import { RoundResult } from '../ui/RoundResult';
import { RegionControls } from './RegionControls';
import type { RulesInput, Territory } from '../game/types';
import { DEFAULT_AI, type AiConfig } from '../game/ai/config';

interface FieldCanvasProps { territories?: readonly Territory[]; rules?: RulesInput; ai?: AiConfig | null; autoStart?: boolean; onHome?: () => void }

export function FieldCanvas({ territories = TERRITORIES, ai = DEFAULT_AI, autoStart = true, onHome, rules }: FieldCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const session = useBoardSession(canvasRef, territories, ai, autoStart, rules);
  const { state, phase } = session;

  return (
    <>
      <div className="mb-3 flex shrink-0 items-center gap-3">
        <div className="min-w-0 flex-1"><TroopCompositionBar state={state} /></div>
        {phase === 'running' && <PauseButton onPause={session.pause} />}
      </div>
      <div className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} tabIndex={-1} className="block h-full w-full touch-none rounded-[20px] bg-field select-none" role="img" aria-label="Territory board" aria-describedby="territory-details upgrade-icon-help">
          Your browser does not support Canvas. Territory details are listed below.
        </canvas>
        <RegionControls state={state} disabled={phase !== 'running'} />
        {state.roundStatus === 'playing' && <SessionControls phase={phase}
          onResume={session.resume} onRestart={session.restart} onHome={onHome} />}
        <RoundResult status={state.roundStatus} onReplay={session.replay} onHome={onHome} />
      </div>
      <TerritoryDetails territories={state.territories} />
      <TransferDetails state={state} />
    </>
  );
}
