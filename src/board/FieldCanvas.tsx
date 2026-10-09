import { useEffect, useRef, useState } from 'react';
import { createSimulation } from '../game/state';
import { TransferDetails } from './TransferDetails';
import { TERRITORIES } from './map';
import { startBoard } from './startBoard';
import { TerritoryDetails } from './TerritoryDetails';

export function FieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Text snapshots change on counts/dispatch/arrival, never on each travel frame.
  const [state, setState] = useState(() => createSimulation(TERRITORIES));

  useEffect(() => {
    if (canvasRef.current) return startBoard(canvasRef.current, setState);
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="block min-h-0 w-full flex-1 touch-none rounded-[20px] bg-field select-none" role="img" aria-label="Territory board" aria-describedby="territory-details">
        Your browser does not support Canvas. Territory details are listed below.
      </canvas>
      <TerritoryDetails territories={state.territories} />
      <TransferDetails state={state} />
    </>
  );
}
