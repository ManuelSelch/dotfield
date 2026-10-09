import { useEffect, useRef, useState } from 'react';
import type { Territory } from '../game/types';
import { TERRITORIES } from './map';
import { startBoard } from './startBoard';
import { TerritoryDetails } from './TerritoryDetails';

export function FieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // This text snapshot changes only when whole-unit counts change, not each frame.
  const [territories, setTerritories] = useState<readonly Territory[]>(TERRITORIES);

  useEffect(() => {
    if (canvasRef.current) return startBoard(canvasRef.current, setTerritories);
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="board" role="img" aria-label="Territory board" aria-describedby="territory-details">
        Your browser does not support Canvas. Territory details are listed below.
      </canvas>
      <TerritoryDetails territories={territories} />
    </>
  );
}
