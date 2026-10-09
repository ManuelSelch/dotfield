import { useEffect, useRef } from 'react';
import { TERRITORIES } from './board';
import { drawBoard } from './drawBoard';

const OWNER_LABELS = { player: 'You', enemy: 'Opponent', neutral: 'Neutral' };

export function FieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function redraw() {
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      drawBoard(canvas, bounds.width, bounds.height, window.devicePixelRatio || 1);
    }

    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    window.addEventListener('resize', redraw);
    redraw();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', redraw);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="board" role="img" aria-label="Territory board" aria-describedby="territory-details">
        Your browser does not support Canvas. Territory details are listed below.
      </canvas>
      <ul id="territory-details" className="visually-hidden" aria-label="Territory details">
        {TERRITORIES.map((node) => (
          <li key={node.id}>{node.id}: {OWNER_LABELS[node.owner]}, {node.units} units.</li>
        ))}
      </ul>
    </>
  );
}
