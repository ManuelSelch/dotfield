import { useEffect, useRef, useState } from 'react';
import { createSimulation } from '../game/state';
import { TransferDetails } from './TransferDetails';
import { TERRITORIES } from './map';
import { startBoard } from './startBoard';
import { TerritoryDetails } from './TerritoryDetails';
import { RoundResult } from '../ui/RoundResult';
import { RegionControls } from './RegionControls';
import type { Territory } from '../game/types';
import { DEFAULT_AI, type AiConfig } from '../game/ai/config';

interface FieldCanvasProps { territories?: readonly Territory[]; ai?: AiConfig | null }

export function FieldCanvas({ territories = TERRITORIES, ai = DEFAULT_AI }: FieldCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Text snapshots change on counts/dispatch/arrival, never on each travel frame.
  const [state, setState] = useState(() => createSimulation(territories));
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (canvasRef.current) return startBoard(canvasRef.current, setState, territories, ai);
  }, [round, territories, ai]);

  function replay() {
    setState(createSimulation(territories));
    setRound(previous => previous + 1);
    canvasRef.current?.focus();
  }

  return (
    <>
      <div className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} tabIndex={-1} className="block h-full w-full touch-none rounded-[20px] bg-field select-none" role="img" aria-label="Territory board" aria-describedby="territory-details">
          Your browser does not support Canvas. Territory details are listed below.
        </canvas>
        <RegionControls state={state} />
        <RoundResult status={state.roundStatus} onReplay={replay} />
      </div>
      <TerritoryDetails territories={state.territories} />
      <TransferDetails state={state} />
    </>
  );
}
